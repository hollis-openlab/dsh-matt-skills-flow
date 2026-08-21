import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
export interface GitCommandResult {
    readonly exitCode: number | null;
    readonly stdout: string;
    readonly stderr: string;
}
export interface GitPreflight {
    readonly root: string;
    readonly head: string;
    readonly branch: string;
}
/** Explicit-argv Git runner for repository preflight and worktree creation. */
export declare class GitRunner {
    private readonly subprocess;
    private readonly executable;
    constructor(subprocess: SubprocessRuntime);
    preflight(repoRoot: string, allowedUntrackedRoot?: string): Promise<GitPreflight>;
    /** Return the exact commit checked out in a repository or worktree. */
    head(cwd: string): Promise<string>;
    /** Return porcelain status without hiding untracked paths. */
    status(cwd: string): Promise<string>;
    /** Return the changed paths between two immutable commits. */
    changedFiles(cwd: string, baseCommit: string, commit: string): Promise<string[]>;
    /** Merge one verified Lane branch into an integration worktree. */
    mergeNoEdit(worktreePath: string, branch: string): Promise<string>;
    /** Verify that a Lane commit descends from its recorded base. */
    isAncestor(cwd: string, baseCommit: string, commit: string): Promise<boolean>;
    /** Remove a clean owned worktree; dirty worktrees are retained for inspection. */
    removeCleanWorktree(repoRoot: string, worktreePath: string): Promise<void>;
    createWorktree(repoRoot: string, branch: string, worktreePath: string, baseCommit: string): Promise<void>;
    private text;
    private run;
}
