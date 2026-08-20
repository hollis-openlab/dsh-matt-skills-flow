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

export interface TrackerAdapter {
  publish(flow: TrackerFlow, signal?: AbortSignal): Promise<TrackerRecord>
}

export class LocalTracker {
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'flow'
}

function trimTail(value: string): string {
  const text = value.trim()
  return text.length > 1000 ? text.slice(-1000) : text
}
