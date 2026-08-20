import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import { realpath } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

export interface GitCommandResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
}

export interface GitPreflight {
  readonly root: string
  readonly head: string
  readonly branch: string
}

/** Explicit-argv Git runner for repository preflight and worktree creation. */
export class GitRunner {
  private readonly executable: Promise<string>

  constructor(private readonly subprocess: SubprocessRuntime) {
    this.executable = subprocess.resolveExecutable('git')
  }

  async preflight(repoRoot: string, allowedUntrackedRoot?: string): Promise<GitPreflight> {
    const root = await this.text(repoRoot, ['rev-parse', '--show-toplevel'])
    if (await realpath(root) !== await realpath(repoRoot)) throw new Error(`REPOSITORY_INVALID: canonical root is ${root}`)
    const status = await this.text(repoRoot, ['status', '--porcelain', '--untracked-files=all'])
    const conflicts = await this.text(repoRoot, ['diff', '--name-only', '--diff-filter=U'])
    if (conflicts.length > 0) throw new Error(`REPOSITORY_CONFLICT: unresolved paths: ${conflicts.split('\n').join(', ')}`)
    const allowed = allowedUntrackedRoot === undefined ? undefined : `${allowedUntrackedRoot.replaceAll('\\', '/').replace(/^\.\//, '')}/`
    const dirty = status.split('\n').filter(line => {
      if (line.length === 0) return false
      if (allowed === undefined || !line.startsWith('?? ')) return true
      return !line.slice(3).replaceAll('\\', '/').startsWith(allowed)
    }).join('\n')
    if (dirty.length > 0) throw new Error('REPOSITORY_DIRTY: integration checkout must be clean')
    const head = await this.text(repoRoot, ['rev-parse', '--verify', 'HEAD'])
    const branch = await this.text(repoRoot, ['symbolic-ref', '--short', 'HEAD'])
    return { root, head, branch }
  }

  /** Return the exact commit checked out in a repository or worktree. */
  async head(cwd: string): Promise<string> {
    return await this.text(cwd, ['rev-parse', '--verify', 'HEAD'])
  }

  /** Return porcelain status without hiding untracked paths. */
  async status(cwd: string): Promise<string> {
    return await this.text(cwd, ['status', '--porcelain', '--untracked-files=all'])
  }

  /** Return the changed paths between two immutable commits. */
  async changedFiles(cwd: string, baseCommit: string, commit: string): Promise<string[]> {
    const output = await this.text(cwd, ['diff', '--name-only', '--no-renames', `${baseCommit}..${commit}`])
    return output.length === 0 ? [] : output.split('\n').filter(Boolean)
  }

  /** Merge one verified Lane branch into an integration worktree. */
  async mergeNoEdit(worktreePath: string, branch: string): Promise<string> {
    const result = await this.run(worktreePath, ['merge', '--no-ff', '--no-edit', branch])
    if (result.exitCode !== 0) throw new Error(`GIT_MERGE_CONFLICT: ${trimTail(result.stderr || result.stdout)}`)
    return await this.head(worktreePath)
  }

  /** Verify that a Lane commit descends from its recorded base. */
  async isAncestor(cwd: string, baseCommit: string, commit: string): Promise<boolean> {
    const result = await this.run(cwd, ['merge-base', '--is-ancestor', baseCommit, commit])
    if (result.exitCode === 0) return true
    if (result.exitCode === 1) return false
    throw new Error(`GIT_OPERATION_FAILED: ${trimTail(result.stderr || result.stdout)}`)
  }

  /** Remove a clean owned worktree; dirty worktrees are retained for inspection. */
  async removeCleanWorktree(repoRoot: string, worktreePath: string): Promise<void> {
    const root = resolve(repoRoot)
    const target = resolve(worktreePath)
    const containment = relative(root, target)
    if (containment.startsWith('..') || containment.includes(`..${separator()}`) || target === root) throw new Error('WORKTREE_ESCAPE: cleanup target leaves repository root')
    const status = await this.status(target)
    if (status.length > 0) throw new Error('WORKTREE_DIRTY: retained uncommitted worktree')
    const result = await this.run(repoRoot, ['worktree', 'remove', target])
    if (result.exitCode !== 0) throw new Error(`GIT_OPERATION_FAILED: ${trimTail(result.stderr || result.stdout)}`)
  }

  async createWorktree(repoRoot: string, branch: string, worktreePath: string, baseCommit: string): Promise<void> {
    const root = resolve(repoRoot)
    const target = resolve(worktreePath)
    const containment = relative(root, target)
    if (containment.startsWith('..') || containment.includes(`..${separator()}`)) throw new Error('WORKTREE_ESCAPE: path leaves repository root')
    if (target === root) throw new Error('WORKTREE_ESCAPE: worktree cannot be the repository root')
    const result = await this.run(repoRoot, ['worktree', 'add', '-b', branch, target, baseCommit])
    if (result.exitCode !== 0) throw new Error(`GIT_OPERATION_FAILED: ${trimTail(result.stderr || result.stdout)}`)
  }

  private async text(cwd: string, args: readonly string[]): Promise<string> {
    const result = await this.run(cwd, args)
    if (result.exitCode !== 0) throw new Error(`GIT_OPERATION_FAILED: ${trimTail(result.stderr || result.stdout)}`)
    return result.stdout.trim()
  }

  private async run(cwd: string, args: readonly string[]): Promise<GitCommandResult> {
    const executable = await this.executable
    const handle = this.subprocess.spawn({
      argv: [executable, ...args],
      cwd,
      stdio: { stdin: 'ignore', stdout: { maxBytes: 64 * 1024 }, stderr: { maxBytes: 64 * 1024 } },
      graceMs: 5000,
    })
    const outcome = await handle.done
    const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
    const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
    return { exitCode: outcome.exitCode, stdout, stderr }
  }
}

function separator(): string {
  return process.platform === 'win32' ? '\\' : '/'
}

function trimTail(value: string): string {
  const text = value.trim()
  return text.length > 1000 ? text.slice(-1000) : text
}
