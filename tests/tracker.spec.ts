import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalTracker } from '../src/tracker.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('LocalTracker', () => {
  it('publishes graph and issue files atomically under .scratch', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'matt-flow-tracker-'))
    roots.push(repoRoot)
    const publication = await new LocalTracker().publish({
      id: 'flow-a' as never, title: 'Login Flow', repoRoot,
      tickets: [{ id: 'ticket-a', title: 'Persist login', status: 'open', blockedBy: [], dependsOn: [] }],
    })
    expect(publication.kind).toBe('local')
    expect(JSON.parse(await readFile(publication.graphPath, 'utf8')).tickets).toHaveLength(1)
  })
})
