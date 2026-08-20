import { describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GitRunner } from '../src/git.ts'
import type { SubprocessRuntime, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'

describe('GitRunner', () => {
  it('uses explicit argv for preflight and worktree creation', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'matt-flow-git-'))
    try {
    const specs: SubprocessSpawnSpec[] = []
    const fake = {
      resolveExecutable: async () => '/usr/bin/git',
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        const output = spec.argv.includes('--show-toplevel') ? `${repo}\n`
          : spec.argv.includes('--verify') ? 'abc123\n'
            : spec.argv.includes('symbolic-ref') ? 'main\n' : ''
        return {
          pid: 1, stdin: undefined, stdout: undefined, stderr: undefined,
          collected: { stdout: { readFrom: () => ({ text: output, nextOffset: output.length, lossy: false }) }, stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) } },
          done: Promise.resolve({ exitCode: 0, signal: null }), terminate: () => {}, waitForExit: async () => true,
        }
      },
    } as unknown as SubprocessRuntime
    const runner = new GitRunner(fake)
    await expect(runner.preflight(repo)).resolves.toEqual({ root: repo, head: 'abc123', branch: 'main' })
    await runner.createWorktree(repo, 'matt-flow/lane-a', `${repo}/.dsh-worktrees/a`, 'abc123')
    expect(specs.at(-1)?.argv).toEqual(['/usr/bin/git', 'worktree', 'add', '-b', 'matt-flow/lane-a', `${repo}/.dsh-worktrees/a`, 'abc123'])
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  it('rejects an unresolved merge before accepting a repository preflight', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'matt-flow-git-conflict-'))
    try {
      const fake = {
        resolveExecutable: async () => '/usr/bin/git',
        spawn: (spec: SubprocessSpawnSpec) => {
          const output = spec.argv.includes('--show-toplevel') ? `${repo}\n`
            : spec.argv.includes('--name-only') ? 'conflicted.ts\n' : ''
          return {
            pid: 1, stdin: undefined, stdout: undefined, stderr: undefined,
            collected: { stdout: { readFrom: () => ({ text: output, nextOffset: output.length, lossy: false }) }, stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) } },
            done: Promise.resolve({ exitCode: 0, signal: null }), terminate: () => {}, waitForExit: async () => true,
          }
        },
      } as unknown as SubprocessRuntime
      await expect(new GitRunner(fake).preflight(repo)).rejects.toThrow('REPOSITORY_CONFLICT')
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })
})
