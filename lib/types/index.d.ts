import type { Context } from '@deepseek-ai/cordis';
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { FlowRecord } from './domain.ts';
import { type FrontierPlan } from './domain.ts';
export declare const name = "dsh-matt-skills-flow";
export declare const inject: string[];
export interface MattSkillsFlowConfig {
    readonly defaultMaxConcurrentLanes: number;
    readonly hardMaxConcurrentLanes: number;
    readonly worktreeRootName: string;
    readonly requiredSkills: string[];
    readonly artifactRoot: string;
    readonly maxArtifactBytes: number;
    readonly laneSubagentProvider: string;
    readonly laneTimeoutMs: number;
    readonly laneMaxTokens: number;
    readonly laneMaxDepth: number;
    readonly reviewTimeoutMs: number;
    readonly reviewAgentPreset: string;
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
    readonly action: string;
}
export interface RecordDecisionRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly question: string;
    readonly answer: string;
}
export interface CreateTicketRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly title: string;
    readonly dependsOn?: readonly string[];
    readonly acceptanceCriteria?: readonly string[];
    readonly workflowRole?: string;
}
export interface UpdateTicketRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly ticketId: string;
    readonly title: string;
    readonly dependsOn?: readonly string[];
    readonly acceptanceCriteria?: readonly string[];
    readonly workflowRole?: string;
}
export interface StartActivityRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly kind: 'research' | 'prototype' | 'wayfinder';
    readonly question: string;
    readonly expectedEvidence?: string;
}
export interface CompleteActivityRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly activityId: string;
    readonly output: string;
    readonly sourceRef: string;
    readonly handoff?: 'to-grilling' | 'to-spec' | 'to-tickets';
}
export interface PrepareLaneRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly ticketId: string;
}
export interface PublishTicketGraphRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
}
export interface ProvisionLaneRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly laneId: string;
}
export interface RunLaneRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly laneId: string;
}
export interface PrepareAcceptanceRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
}
export interface PreviewFrontierRequest {
    readonly flowId: string;
}
export interface StartFrontierRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly maxConcurrent?: number;
}
export interface RequestReviewRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
}
export interface DisposeFindingRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly findingId: string;
    readonly kind: 'fixed' | 'rejected' | 'deferred';
    readonly reason: string;
}
export interface SpecRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
}
export interface ExportRequest {
    readonly flowId: string;
}
export interface AcceptFlowRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly candidateArtifactId: string;
    readonly accept: true;
}
export interface CleanupLaneRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly laneId: string;
}
export interface IntegrateLaneRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly laneId: string;
}
export interface AnswerQuestionRequest {
    readonly flowId: string;
    readonly expectedRevision: number;
    readonly questionId: string;
    readonly answer: string;
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
    private readonly artifactStore;
    private readonly tracker;
    private readonly git;
    private readonly flowHandles;
    private readonly reviewHandles;
    private readonly integrationPromises;
    constructor(ctx: Context, config?: Partial<MattSkillsFlowConfig>);
    protected [Service.init](): Promise<void>;
    /** Register the root-user command surface over the same durable methods as the Web UI. */
    private commandDefinition;
    private executeCommand;
    private resolveCommandFlow;
    private formatCommandFlow;
    /** List bounded Flow summaries for the current Host. */
    list(): FlowListResult;
    /** Read one durable Flow. */
    get(request: GetFlowRequest): FlowRecord;
    /** Create an intake Flow bound to an existing Workspace or repository root. */
    create(request: CreateFlowRequest): Promise<FlowRecord>;
    /** Advance the visible phase for the initial vertical slice. */
    advance(request: AdvanceFlowRequest): Promise<FlowRecord>;
    /** Append a decision and supersede the previous answer to the same question. */
    decide(request: RecordDecisionRequest): Promise<FlowRecord>;
    /** Add one Ticket to the durable graph, rejecting unknown or duplicate dependencies. */
    ticket(request: CreateTicketRequest): Promise<FlowRecord>;
    /** Edit one unpublished Ticket while preserving the graph's acyclic dependency contract. */
    updateTicket(request: UpdateTicketRequest): Promise<FlowRecord>;
    /** Start a bounded Research, Prototype, or Wayfinder activity from an explicit planning phase. */
    startActivity(request: StartActivityRequest): Promise<FlowRecord>;
    /** Complete a planning activity with an immutable evidence reference and optional Wayfinder handoff. */
    completeActivity(request: CompleteActivityRequest): Promise<FlowRecord>;
    /** Reserve an isolated Lane path for one Ticket without running Git commands yet. */
    lane(request: PrepareLaneRequest): Promise<FlowRecord>;
    private ensureIntegration;
    /** Run repository preflight and create one reserved Lane worktree. */
    provisionLane(request: ProvisionLaneRequest): Promise<FlowRecord>;
    /** Merge one completed Lane into the Flow integration worktree after a human Gate. */
    integrate(request: IntegrateLaneRequest): Promise<FlowRecord>;
    /** Persist a root answer as a Decision and re-arm the blocked Lane with a new packet digest. */
    answerQuestion(request: AnswerQuestionRequest): Promise<FlowRecord>;
    /** Dispatch one structured Lane Agent run from an immutable Task Packet. */
    runLane(request: RunLaneRequest): Promise<FlowRecord>;
    private driveLane;
    private finishLane;
    /** Freeze completed Lane evidence into a candidate and arm the human acceptance Gate. */
    prepareAcceptance(request: PrepareAcceptanceRequest): Promise<FlowRecord>;
    /** Commit a human acceptance decision against the frozen candidate and exact Git commit. */
    accept(request: AcceptFlowRequest): Promise<FlowRecord>;
    /** Remove one clean Lane worktree while retaining its immutable Flow evidence. */
    cleanup(request: CleanupLaneRequest): Promise<FlowRecord>;
    /** Explicitly resume a cold root Session and record a reconciled recovery checkpoint. */
    resume(request: PrepareAcceptanceRequest): Promise<FlowRecord>;
    /** Run independent Standards and Spec review Agents against the immutable candidate. */
    requestReview(request: RequestReviewRequest): Promise<FlowRecord>;
    private driveReview;
    /** Record a human disposition for one Review finding and reopen acceptance when all are settled. */
    disposeFinding(request: DisposeFindingRequest): Promise<FlowRecord>;
    /** Compile active Decisions into a bounded, immutable Spec draft. */
    generateSpec(request: SpecRequest): Promise<FlowRecord>;
    /** Approve the current Spec draft and freeze its digest for dependent work. */
    approveSpec(request: SpecRequest): Promise<FlowRecord>;
    /** Export a redacted bounded evidence manifest without Skill bodies or prompts. */
    exportEvidence(request: ExportRequest): Promise<FlowRecord>;
    private runReviewAxis;
    /** Return a deterministic, side-effect-free Frontier plan for the current Flow. */
    previewFrontier(request: PreviewFrontierRequest): FrontierPlan;
    /** Admit all currently unclaimed Frontier Lanes in one CAS and run them in the background. */
    startFrontier(request: StartFrontierRequest): Promise<FlowRecord>;
    /** Publish the current Ticket Graph to the repository-local Markdown tracker. */
    publish(request: PublishTicketGraphRequest): Promise<FlowRecord>;
    private snapshotSkills;
    private ensureRootAgent;
    private rootForFlow;
    private ensureReviewAgent;
    private loadSkill;
    private startPlanning;
}
export default MattSkillsFlowService;
