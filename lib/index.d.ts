import type { Context } from '@deepseek-ai/cordis';
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { FlowRecord } from './domain.ts';
export declare const name = "dsh-matt-skills-flow";
export declare const inject: string[];
export interface MattSkillsFlowConfig {
    readonly defaultMaxConcurrentLanes: number;
    readonly hardMaxConcurrentLanes: number;
    readonly worktreeRootName: string;
}
export declare const Config: z<MattSkillsFlowConfig>;
export interface CreateFlowRequest {
    readonly title: string;
    readonly repoRoot: string;
    readonly workspaceId?: string;
}
export interface GetFlowRequest {
    readonly flowId: string;
}
export interface AdvanceFlowRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly phase: string;
}
export interface FlowListResult {
    readonly flows: readonly FlowRecord[];
}
/** Host service for the first durable Flow vertical slice. */
export declare class MattSkillsFlowService extends TypertRemoteService {
    static inject: string[];
    static Config: z<MattSkillsFlowConfig>;
    private readonly config;
    private readonly repository;
    private readonly workspaceRegistry;
    constructor(ctx: Context, config?: Partial<MattSkillsFlowConfig>);
    protected [Service.init](): Promise<void>;
    /** List bounded Flow summaries for the current Host. */
    list(): FlowListResult;
    /** Read one durable Flow. */
    get(request: GetFlowRequest): FlowRecord;
    /** Create an intake Flow bound to an existing Workspace or repository root. */
    create(request: CreateFlowRequest): Promise<FlowRecord>;
    /** Advance the visible phase for the initial vertical slice. */
    advance(request: AdvanceFlowRequest): Promise<FlowRecord>;
}
export default MattSkillsFlowService;
