import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import type { SubprocessRuntime, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type { FlowRecord } from './domain.ts'

export type TrackerFlow = Pick<FlowRecord, 'id' | 'title' | 'repoRoot' | 'tickets'>

export interface LocalTrackerRecord {
  readonly kind: 'local'
  readonly root: string
  readonly graphPath: string
  readonly graphSha256: string
  readonly publishedAt: number
}

export interface GitHubTrackerRecord {
  readonly kind: 'github'
  readonly repository: string
  readonly graphPath: string
  readonly graphSha256: string
  readonly issueNumbers: readonly number[]
  readonly issueUrls: readonly string[]
  readonly publishedAt: number
}

export type TrackerRecord = LocalTrackerRecord | GitHubTrackerRecord

export interface TrackerSnapshot {
  readonly kind: TrackerRecord['kind']
  readonly graphSha256: string
  readonly drift: readonly string[]
  readonly statuses: Readonly<Record<string, string>>
}

export interface TrackerRef {
  readonly kind: TrackerRecord['kind']
  readonly key: string
  readonly url?: string
}

export interface TrackerArtifact {
  readonly ref: TrackerRef
  readonly title: string
  readonly body: string
  readonly sha256: string
}

export interface TrackerAdapter {
  publish(flow: TrackerFlow, signal?: AbortSignal): Promise<TrackerRecord>
  inspect(flow: TrackerFlow, publication: TrackerRecord, signal?: AbortSignal): Promise<TrackerSnapshot>
  publishSpec(flow: TrackerFlow, title: string, body: string, signal?: AbortSignal): Promise<TrackerRef>
  readSpec(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>
  publishTickets(flow: TrackerFlow, signal?: AbortSignal): Promise<readonly TrackerRef[]>
  readTicket(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>
  readStatuses(flow: TrackerFlow, publication: TrackerRecord, signal?: AbortSignal): Promise<Readonly<Record<string, string>>>
  appendComment(flow: TrackerFlow, publication: TrackerRecord, ticketId: string, body: string, signal?: AbortSignal): Promise<TrackerRef>
}

export class LocalTracker implements TrackerAdapter {
  async publish(flow: TrackerFlow): Promise<LocalTrackerRecord> {
    const root = resolve(flow.repoRoot, '.scratch', slug(`${flow.title}-${flow.id.slice(-8)}`))
    const graphPath = join(root, 'graph.json')
    const graph = ticketGraph(flow)
    const bytes = Buffer.from(`${JSON.stringify(graph, null, 2)}\n`, 'utf8')
    const graphSha256 = createHash('sha256').update(bytes).digest('hex')
    await mkdir(join(root, 'issues'), { recursive: true })
    await writeOwned(graphPath, bytes)
    for (const [index, ticket] of flow.tickets.entries()) {
      const issuePath = join(root, 'issues', `${String(index + 1).padStart(2, '0')}-${slug(ticket.title)}.md`)
      await writeOwned(issuePath, Buffer.from(ticketBody(ticket, new Map()), 'utf8'))
    }
    return { kind: 'local', root, graphPath, graphSha256, publishedAt: Date.now() }
  }

  async inspect(flow: TrackerFlow, publication: LocalTrackerRecord): Promise<TrackerSnapshot> {
    const drift: string[] = []
    const bytes = await readFile(publication.graphPath).catch(() => undefined)
    const graphSha256 = bytes === undefined ? '' : createHash('sha256').update(bytes).digest('hex')
    if (graphSha256 !== publication.graphSha256) drift.push('graph')
    for (const [index, ticket] of flow.tickets.entries()) {
      const issuePath = join(publication.root, 'issues', `${String(index + 1).padStart(2, '0')}-${slug(ticket.title)}.md`)
      const issue = await readFile(issuePath, 'utf8').catch(() => undefined)
      if (issue !== ticketBody(ticket, new Map())) drift.push(`ticket:${ticket.id}`)
    }
    return { kind: 'local', graphSha256, drift, statuses: Object.fromEntries(flow.tickets.map(ticket => [ticket.id, ticket.status])) }
  }

  async publishSpec(flow: TrackerFlow, title: string, body: string): Promise<TrackerRef> {
    const path = join(resolve(flow.repoRoot, '.scratch', slug(`${flow.title}-${flow.id.slice(-8)}`)), 'spec.md')
    await mkdir(resolve(path, '..'), { recursive: true })
    await writeOwned(path, Buffer.from(`# ${title}\n\n${body.trim()}\n`, 'utf8'))
    return { kind: 'local', key: path }
  }

  async readSpec(flow: TrackerFlow, ref: TrackerRef): Promise<TrackerArtifact> {
    const body = await readOwnedTrackerPath(flow.repoRoot, ref.key)
    return { ref, title: body.split('\n')[0]?.replace(/^#\s*/, '') ?? '', body, sha256: createHash('sha256').update(body).digest('hex') }
  }

  async publishTickets(flow: TrackerFlow): Promise<readonly TrackerRef[]> {
    const publication = await this.publish(flow)
    return flow.tickets.map((ticket, index) => ({ kind: 'local' as const, key: join(publication.root, 'issues', `${String(index + 1).padStart(2, '0')}-${slug(ticket.title)}.md`) }))
  }

  async readTicket(flow: TrackerFlow, ref: TrackerRef): Promise<TrackerArtifact> {
    const body = await readOwnedTrackerPath(flow.repoRoot, ref.key)
    return { ref, title: body.split('\n')[0]?.replace(/^#\s*/, '') ?? '', body, sha256: createHash('sha256').update(body).digest('hex') }
  }

  async readStatuses(flow: TrackerFlow, _publication: LocalTrackerRecord): Promise<Readonly<Record<string, string>>> {
    return Object.fromEntries(flow.tickets.map(ticket => [ticket.id, ticket.status]))
  }

  async appendComment(flow: TrackerFlow, publication: LocalTrackerRecord, ticketId: string, body: string): Promise<TrackerRef> {
    const index = flow.tickets.findIndex(ticket => ticket.id === ticketId)
    if (index < 0) throw new Error(`TRACKER_TICKET_NOT_FOUND: ${ticketId}`)
    const ticket = flow.tickets[index]
    const path = join(publication.root, 'issues', `${String(index + 1).padStart(2, '0')}-${slug(ticket.title)}.md`)
    const expected = Buffer.from(ticketBody(ticket, new Map()), 'utf8')
    const existing = await readFile(path)
    if (!existing.equals(expected)) throw new Error(`TRACKER_DRIFT: ticket:${ticketId}`)
    await writeIfUnchanged(path, existing, Buffer.from(`${existing.toString('utf8')}\n## Comment\n${body.trim()}\n`, 'utf8'))
    return { kind: 'local', key: path }
  }
}

/** Publish a Ticket Graph as GitHub Issues without granting the tracker broader write authority. */
export class GitHubTracker implements TrackerAdapter {
  private readonly ghExecutable: Promise<string>
  private readonly gitExecutable: Promise<string>

  constructor(private readonly subprocess: SubprocessRuntime, private readonly configuredRepository?: string) {
    this.ghExecutable = subprocess.resolveExecutable('gh')
    this.gitExecutable = subprocess.resolveExecutable('git')
  }

  async publish(flow: TrackerFlow, signal?: AbortSignal): Promise<GitHubTrackerRecord> {
    const repository = await this.resolveRepository(flow.repoRoot, signal)
    await this.run(await this.ghExecutable, flow.repoRoot, ['auth', 'status', '--hostname', 'github.com'], signal)
    await this.run(await this.ghExecutable, flow.repoRoot, ['api', `repos/${repository}`, '--jq', '.full_name'], signal)
    const root = resolve(flow.repoRoot, '.scratch', slug(`${flow.title}-${flow.id.slice(-8)}-github`))
    const graphPath = join(root, 'graph.json')
    const graph = ticketGraph(flow)
    const graphBytes = Buffer.from(`${JSON.stringify(graph, null, 2)}\n`, 'utf8')
    const graphSha256 = createHash('sha256').update(graphBytes).digest('hex')
    await mkdir(join(root, 'issues'), { recursive: true })
    await writeOwned(graphPath, graphBytes)
    const issueNumbers = new Map<string, number>()
    const issueUrls: string[] = []
    for (const ticket of topologicalTickets(flow.tickets)) {
      const body = ticketBody(ticket, issueNumbers)
      const payload = await this.runJson<{ number: number; html_url: string }>(
        await this.ghExecutable,
        flow.repoRoot,
        ['api', `repos/${repository}/issues`, '--method', 'POST', '-f', `title=${ticket.title}`, '-f', `body=${body}`],
        signal,
      )
      if (!Number.isSafeInteger(payload.number) || typeof payload.html_url !== 'string') throw new Error('GITHUB_TRACKER_INVALID_RESPONSE: issue creation did not return number and html_url')
      issueNumbers.set(ticket.id, payload.number)
      issueUrls.push(payload.html_url)
      const issuePath = join(root, 'issues', `${String(issueUrls.length).padStart(2, '0')}-${slug(ticket.title)}.md`)
      await writeOwned(issuePath, Buffer.from(body, 'utf8'))
    }
    return { kind: 'github', repository, graphPath, graphSha256, issueNumbers: topologicalTickets(flow.tickets).map(ticket => issueNumbers.get(ticket.id) as number), issueUrls, publishedAt: Date.now() }
  }

  async inspect(flow: TrackerFlow, publication: GitHubTrackerRecord, signal?: AbortSignal): Promise<TrackerSnapshot> {
    const drift: string[] = []
    const statuses: Record<string, string> = {}
    const bytes = await readFile(publication.graphPath).catch(() => undefined)
    const graphSha256 = bytes === undefined ? '' : createHash('sha256').update(bytes).digest('hex')
    if (graphSha256 !== publication.graphSha256) drift.push('graph')
    const ordered = topologicalTickets(flow.tickets)
    for (const [index, ticket] of ordered.entries()) {
      const number = publication.issueNumbers[index]
      if (number === undefined) { drift.push(`ticket:${ticket.id}`); continue }
      const payload = await this.runJson<{ title: string; body: string; state: string }>(await this.ghExecutable, flow.repoRoot, ['api', `repos/${publication.repository}/issues/${number}`, '--jq', '{title: .title, body: .body, state: .state}'], signal)
      statuses[ticket.id] = payload.state
      if (payload.title !== ticket.title || payload.body !== ticketBody(ticket, new Map(ordered.slice(0, index).map((item, itemIndex) => [item.id, publication.issueNumbers[itemIndex] as number])))) drift.push(`ticket:${ticket.id}`)
    }
    return { kind: 'github', graphSha256, drift, statuses }
  }

  async publishSpec(flow: TrackerFlow, title: string, body: string, signal?: AbortSignal): Promise<TrackerRef> {
    const repository = await this.resolveRepository(flow.repoRoot, signal)
    const payload = await this.runJson<{ number: number; html_url: string }>(await this.ghExecutable, flow.repoRoot, ['api', `repos/${repository}/issues`, '--method', 'POST', '-f', `title=${title}`, '-f', `body=${body}`], signal)
    return { kind: 'github', key: String(payload.number), url: payload.html_url }
  }

  async readSpec(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact> {
    const repository = await this.resolveRepository(flow.repoRoot, signal)
    const payload = await this.runJson<{ title: string; body: string }>(await this.ghExecutable, flow.repoRoot, ['api', `repos/${repository}/issues/${ref.key}`, '--jq', '{title: .title, body: .body}'], signal)
    return { ref, title: payload.title, body: payload.body, sha256: createHash('sha256').update(payload.body).digest('hex') }
  }

  async publishTickets(flow: TrackerFlow, signal?: AbortSignal): Promise<readonly TrackerRef[]> {
    const publication = await this.publish(flow, signal)
    return publication.issueNumbers.map((number, index) => ({ kind: 'github' as const, key: String(number), url: publication.issueUrls[index] }))
  }

  async readTicket(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact> {
    return await this.readSpec(flow, ref, signal)
  }

  async readStatuses(flow: TrackerFlow, publication: GitHubTrackerRecord, signal?: AbortSignal): Promise<Readonly<Record<string, string>>> {
    return (await this.inspect(flow, publication, signal)).statuses
  }

  async appendComment(flow: TrackerFlow, publication: GitHubTrackerRecord, ticketId: string, body: string, signal?: AbortSignal): Promise<TrackerRef> {
    const index = flow.tickets.findIndex(ticket => ticket.id === ticketId)
    if (index < 0) throw new Error(`TRACKER_TICKET_NOT_FOUND: ${ticketId}`)
    const number = publication.issueNumbers[index]
    if (number === undefined) throw new Error(`TRACKER_TICKET_NOT_FOUND: ${ticketId}`)
    const payload = await this.runJson<{ id: number; html_url: string }>(await this.ghExecutable, flow.repoRoot, ['api', `repos/${publication.repository}/issues/${number}/comments`, '--method', 'POST', '-f', `body=${body}`], signal)
    return { kind: 'github', key: String(payload.id), url: payload.html_url }
  }

  private async resolveRepository(repoRoot: string, signal?: AbortSignal): Promise<string> {
    const configured = this.configuredRepository?.trim()
    if (configured !== undefined && configured.length > 0) return normalizeRepository(configured)
    const remote = await this.run(await this.gitExecutable, repoRoot, ['remote', 'get-url', 'origin'], signal)
    return parseGitHubRepository(remote.stdout.trim())
  }

  private async runJson<T>(executable: string, cwd: string, args: readonly string[], signal?: AbortSignal): Promise<T> {
    const result = await this.run(executable, cwd, args, signal)
    try {
      return JSON.parse(result.stdout) as T
    } catch {
      throw new Error(`GITHUB_TRACKER_INVALID_JSON: ${trimTail(result.stdout)}`)
    }
  }

  private async run(executable: string, cwd: string, args: readonly string[], signal?: AbortSignal): Promise<TrackerCommandResult> {
    const spec: SubprocessSpawnSpec = {
      argv: [executable, ...args],
      cwd,
      stdio: { stdin: 'ignore', stdout: { maxBytes: 128 * 1024 }, stderr: { maxBytes: 128 * 1024 } },
      graceMs: 5000,
      ...(signal === undefined ? {} : { signal }),
    }
    const handle = this.subprocess.spawn(spec)
    const outcome = await handle.done
    const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
    const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
    if (outcome.exitCode !== 0) throw new Error(`GITHUB_TRACKER_COMMAND_FAILED: ${args[0] ?? 'gh'} ${trimTail(stderr || stdout)}`)
    return { stdout, stderr }
  }
}

interface TrackerCommandResult {
  readonly stdout: string
  readonly stderr: string
}

function ticketGraph(flow: TrackerFlow): { schema: 'dsh-matt-skills-flow/ticket-graph/v1'; flowId: string; tickets: readonly unknown[] } {
  return {
    schema: 'dsh-matt-skills-flow/ticket-graph/v1',
    flowId: flow.id,
    tickets: flow.tickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      workflow: ticket.workflowRole ?? 'implement',
      blockedBy: ticket.blockedBy,
      dependsOn: ticket.dependsOn,
      acceptanceCriteria: ticket.acceptanceCriteria ?? [],
      outOfScope: [],
    })),
  }
}

function ticketBody(ticket: TrackerFlow['tickets'][number], issueNumbers: ReadonlyMap<string, number>): string {
  const dependencies = ticket.dependsOn.map(id => issueNumbers.get(id) === undefined ? id : `#${issueNumbers.get(id)}`).join(', ') || 'none'
  const criteria = (ticket.acceptanceCriteria ?? []).map(item => `- ${item}`).join('\n') || '- (not specified)'
  return `# ${ticket.title}\n\n- ID: ${ticket.id}\n- Status: ${ticket.status}\n- Workflow: ${ticket.workflowRole ?? 'implement'}\n- Depends on: ${dependencies}\n\n## Acceptance criteria\n${criteria}\n`
}

function topologicalTickets(tickets: TrackerFlow['tickets']): TrackerFlow['tickets'] {
  const remaining = new Map(tickets.map(ticket => [ticket.id, ticket]))
  const ordered: TrackerFlow['tickets'][number][] = []
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter(ticket => ticket.dependsOn.every(id => !remaining.has(id)))
    if (ready.length === 0) throw new Error('TRACKER_GRAPH_CYCLE: cannot publish GitHub issues with cyclic dependencies')
    for (const ticket of ready.sort((a, b) => a.id.localeCompare(b.id))) {
      remaining.delete(ticket.id)
      ordered.push(ticket)
    }
  }
  return ordered
}

function normalizeRepository(value: string): string {
  const repository = value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/^git@github\.com:/, '').replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error(`GITHUB_REPOSITORY_INVALID: ${value}`)
  return repository
}

function parseGitHubRepository(remote: string): string {
  if (!remote.includes('github.com')) throw new Error(`GITHUB_REMOTE_INVALID: ${remote}`)
  return normalizeRepository(remote)
}

async function writeOwned(path: string, bytes: Buffer): Promise<void> {
  try {
    const existing = await readFile(path)
    if (!existing.equals(bytes)) throw new Error(`TRACKER_DRIFT: refusing to overwrite ${path}`)
    return
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const temporary = `${path}.tmp-${randomUUID()}`
  await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 })
  await rename(temporary, path)
}

async function readOwnedTrackerPath(repoRoot: string, path: string): Promise<string> {
  const root = resolve(repoRoot, '.scratch')
  const target = resolve(path)
  const relative = target.slice(root.length)
  if (target !== root && (!relative.startsWith('/') && !relative.startsWith('\\'))) throw new Error('TRACKER_PATH_ESCAPE: tracker reference leaves .scratch')
  return await readFile(target, 'utf8')
}

async function writeIfUnchanged(path: string, expected: Buffer, next: Buffer): Promise<void> {
  const current = await readFile(path)
  if (!current.equals(expected)) throw new Error(`TRACKER_DRIFT: refusing to overwrite ${path}`)
  const temporary = `${path}.tmp-${randomUUID()}`
  await writeFile(temporary, next, { flag: 'wx', mode: 0o600 })
  await rename(temporary, path)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'flow'
}

function trimTail(value: string): string {
  const text = value.trim()
  return text.length > 1000 ? text.slice(-1000) : text
}
