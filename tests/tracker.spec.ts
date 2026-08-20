import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { GitHubTracker, LocalTracker } from '../src/tracker.ts'
import type { SubprocessRuntime, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'

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
    await expect(new LocalTracker().inspect({
      id: 'flow-a' as never, title: 'Login Flow', repoRoot,
      tickets: [{ id: 'ticket-a', title: 'Persist login', status: 'open', blockedBy: [], dependsOn: [] }],
    }, publication)).resolves.toEqual({ kind: 'local', graphSha256: publication.graphSha256, drift: [], statuses: { 'ticket-a': 'open' } })
    await expect(new LocalTracker().inspect({
      id: 'flow-a' as never, title: 'Login Flow', repoRoot,
      tickets: [{ id: 'ticket-a', title: 'Persist login', status: 'integrated', blockedBy: [], dependsOn: [] }],
    }, publication)).resolves.toMatchObject({ drift: [], statuses: { 'ticket-a': 'integrated' } })
    await writeFile(publication.graphPath, 'tampered\n', 'utf8')
    await expect(new LocalTracker().inspect({
      id: 'flow-a' as never, title: 'Login Flow', repoRoot,
      tickets: [{ id: 'ticket-a', title: 'Persist login', status: 'open', blockedBy: [], dependsOn: [] }],
    }, publication)).resolves.toMatchObject({ drift: ['graph'] })
  })
})

describe('GitHubTracker', () => {
  it('verifies auth, resolves the remote, and creates issues in dependency order', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'matt-flow-github-tracker-'))
    roots.push(repoRoot)
    const specs: SubprocessSpawnSpec[] = []
    let issueNumber = 100
    const fake = {
      resolveExecutable: async (command: string) => `/usr/bin/${command}`,
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        const args = [...spec.argv]
        const stdout = args[0] === '/usr/bin/git' ? 'git@github.com:hollis-openlab/example.git\n'
          : args.includes('--method') ? JSON.stringify({ number: ++issueNumber, html_url: `https://github.com/hollis-openlab/example/issues/${issueNumber}` })
            : args.includes('--jq') ? 'hollis-openlab/example\n' : 'Logged in\n'
        return {
          pid: 1, stdin: undefined, stdout: undefined, stderr: undefined,
          collected: { stdout: { readFrom: () => ({ text: stdout, nextOffset: stdout.length, lossy: false }) }, stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) } },
          done: Promise.resolve({ exitCode: 0, signal: null }), terminate: () => {}, waitForExit: async () => true,
        }
      },
    } as unknown as SubprocessRuntime
    const publication = await new GitHubTracker(fake).publish({
      id: 'flow-github' as never, title: 'GitHub Flow', repoRoot,
      tickets: [
        { id: 'ticket-child', title: 'Child', status: 'open', blockedBy: [], dependsOn: ['ticket-parent'], acceptanceCriteria: ['Child works'] },
        { id: 'ticket-parent', title: 'Parent', status: 'open', blockedBy: [], dependsOn: [], acceptanceCriteria: ['Parent works'] },
      ],
    })
    expect(publication.kind).toBe('github')
    if (publication.kind !== 'github') throw new Error('expected GitHub publication')
    expect(publication.repository).toBe('hollis-openlab/example')
    expect(publication.issueNumbers).toEqual([101, 102])
    const issueBodies = specs.filter(spec => spec.argv.includes('--method')).map(spec => spec.argv.find(arg => arg.startsWith('body=')) ?? '')
    expect(issueBodies[1]).toContain('Depends on: #101')
  })

  it('rejects a non-GitHub remote before attempting mutation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'matt-flow-github-remote-'))
    roots.push(repoRoot)
    const fake = {
      resolveExecutable: async (command: string) => `/usr/bin/${command}`,
      spawn: (spec: SubprocessSpawnSpec) => ({
        pid: 1, stdin: undefined, stdout: undefined, stderr: undefined,
        collected: { stdout: { readFrom: () => ({ text: 'https://gitlab.example/acme/repo.git\n', nextOffset: 40, lossy: false }) }, stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) } },
        done: Promise.resolve({ exitCode: 0, signal: null }), terminate: () => {}, waitForExit: async () => true,
      }),
    } as unknown as SubprocessRuntime
    await expect(new GitHubTracker(fake).publish({ id: 'flow-github' as never, title: 'GitHub Flow', repoRoot, tickets: [] })).rejects.toThrow('GITHUB_REMOTE_INVALID')
  })
})
