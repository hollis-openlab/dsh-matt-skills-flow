import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import type { FlowRecord } from './domain.ts'

export interface LocalTrackerRecord {
  readonly kind: 'local'
  readonly root: string
  readonly graphPath: string
  readonly graphSha256: string
  readonly publishedAt: number
}

export class LocalTracker {
  async publish(flow: Pick<FlowRecord, 'id' | 'title' | 'repoRoot' | 'tickets'>): Promise<LocalTrackerRecord> {
    const root = resolve(flow.repoRoot, '.scratch', slug(`${flow.title}-${flow.id.slice(-8)}`))
    const graphPath = join(root, 'graph.json')
    const graph = {
      schema: 'dsh-matt-skills-flow/ticket-graph/v1',
      flowId: flow.id,
      tickets: flow.tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        workflow: 'implement',
        blockedBy: ticket.blockedBy,
        dependsOn: ticket.dependsOn,
        acceptanceCriteria: [],
        outOfScope: [],
      })),
    }
    const bytes = Buffer.from(`${JSON.stringify(graph, null, 2)}\n`, 'utf8')
    const graphSha256 = createHash('sha256').update(bytes).digest('hex')
    await mkdir(join(root, 'issues'), { recursive: true })
    await writeOwned(graphPath, bytes)
    for (const [index, ticket] of flow.tickets.entries()) {
      const issuePath = join(root, 'issues', `${String(index + 1).padStart(2, '0')}-${slug(ticket.title)}.md`)
      await writeOwned(issuePath, Buffer.from(`# ${ticket.title}\n\n- ID: ${ticket.id}\n- Status: ${ticket.status}\n- Depends on: ${ticket.dependsOn.join(', ') || 'none'}\n`, 'utf8'))
    }
    return { kind: 'local', root, graphPath, graphSha256, publishedAt: Date.now() }
  }
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
