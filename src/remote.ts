import { z } from 'zod'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { FlowRecord } from './domain.ts'

const flowSchema = z.object({
  schemaVersion: z.literal(1), id: z.string(), revision: z.number(), title: z.string(), workspaceId: z.string().optional(),
  repoRoot: z.string(), rootSessionId: z.string().optional(), phase: z.string(), pausedFrom: z.string().optional(), planningReturnPhase: z.string().optional(), nextAction: z.string(), createdAt: z.number(), updatedAt: z.number(),
  decisions: z.array(z.unknown()), tickets: z.array(z.unknown()), lanes: z.array(z.unknown()), questions: z.array(z.unknown()), artifacts: z.array(z.unknown()).default([]),
  skillSnapshot: z.unknown().optional(), acceptance: z.unknown().optional(),
  tracker: z.object({ kind: z.literal('local'), root: z.string(), graphPath: z.string(), graphSha256: z.string(), publishedAt: z.number() }).strict().optional(),
  integration: z.object({ branch: z.string(), worktreePath: z.string(), baseCommit: z.string(), headCommit: z.string() }).strict().optional(),
  review: z.object({ candidateArtifactId: z.string(), candidateSha256: z.string(), fixedPoint: z.string(), createdAt: z.number(), status: z.string().optional(), round: z.number().int().nonnegative().optional(), findings: z.array(z.unknown()).optional() }).strict().optional(),
  recovery: z.object({ status: z.string(), reason: z.string().optional(), observedAt: z.number() }).strict().optional(),
  spec: z.object({ status: z.string(), artifactId: z.string(), sha256: z.string(), createdAt: z.number(), approvedAt: z.number().optional() }).strict().optional(),
  export: z.object({ artifactId: z.string(), sha256: z.string(), createdAt: z.number() }).strict().optional(),
}).passthrough()

const createRequestSchema = z.object({ title: z.string().min(1), repoRoot: z.string().min(1), workspaceId: z.string().optional() }).strict()
const idRequestSchema = z.object({ flowId: z.string() }).strict()
const advanceRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), action: z.string().min(1) }).strict()
const decisionRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), question: z.string().min(1), answer: z.string().min(1) }).strict()
const ticketRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), title: z.string().min(1), dependsOn: z.array(z.string()).optional(), acceptanceCriteria: z.array(z.string()).optional(), workflowRole: z.string().optional() }).strict()
const updateTicketRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), ticketId: z.string().min(1), title: z.string().min(1), dependsOn: z.array(z.string()).optional(), acceptanceCriteria: z.array(z.string()).optional(), workflowRole: z.string().optional() }).strict()
const startActivityRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), kind: z.enum(['research', 'prototype', 'wayfinder']), question: z.string().min(1), expectedEvidence: z.string().optional() }).strict()
const completeActivityRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), activityId: z.string().min(1), output: z.string().min(1), sourceRef: z.string().min(1), handoff: z.enum(['to-grilling', 'to-spec', 'to-tickets']).optional() }).strict()
const rejectAcceptanceRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), candidateArtifactId: z.string().min(1), reason: z.string().min(1), returnTo: z.enum(['grilling', 'wayfinding', 'ticketing']) }).strict()
const laneRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), ticketId: z.string().min(1) }).strict()
const publishRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive() }).strict()
const provisionLaneRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), laneId: z.string().min(1) }).strict()
const runLaneRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), laneId: z.string().min(1) }).strict()
const prepareAcceptanceRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive() }).strict()
const acceptRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), candidateArtifactId: z.string().min(1), accept: z.literal(true) }).strict()
const cleanupLaneRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), laneId: z.string().min(1) }).strict()
const integrateLaneRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), laneId: z.string().min(1) }).strict()
const answerQuestionRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), questionId: z.string().min(1), answer: z.string().min(1) }).strict()
const resumeFlowRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive() }).strict()
const frontierRequestSchema = z.object({ flowId: z.string() }).strict()
const startFrontierRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), maxConcurrent: z.number().int().positive().optional() }).strict()
const reviewRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive() }).strict()
const disposeFindingRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), findingId: z.string().min(1), kind: z.enum(['fixed', 'rejected', 'deferred']), reason: z.string().min(1) }).strict()
const specRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive() }).strict()
const exportRequestSchema = z.object({ flowId: z.string() }).strict()
const frontierSchema = z.object({ flowId: z.string(), flowRevision: z.number(), tickets: z.array(z.string()), maxConcurrent: z.number(), maxDepth: z.number(), maxTotalAgents: z.number(), warnings: z.array(z.string()) }).strict()
const flowListSchema = z.object({ flows: z.array(flowSchema) }).strict()

export const CREATE_FLOW_SCHEMA = createRequestSchema
export const ADVANCE_FLOW_SCHEMA = advanceRequestSchema

export const TYPERT_REMOTE = {
  package: '@deepseek-ai/dsh-matt-skills-flow',
  descriptors: [
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/list',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'list', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowListResult', schema: flowListSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 75, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/get',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'get', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#GetFlowRequest', schema: idRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 84, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/create',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'create', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#CreateFlowRequest', schema: createRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 91, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/advance',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'advance', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#AdvanceFlowRequest', schema: advanceRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 101, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/decide',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'decide', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#RecordDecisionRequest', schema: decisionRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 181, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/ticket',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'ticket', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#CreateTicketRequest', schema: ticketRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 203, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/updateTicket',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'updateTicket', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#UpdateTicketRequest', schema: updateTicketRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 470, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/startActivity', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'startActivity', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#StartActivityRequest', schema: startActivityRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 510, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/completeActivity', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'completeActivity', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#CompleteActivityRequest', schema: completeActivityRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 540, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/rejectAcceptance', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'rejectAcceptance', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#RejectAcceptanceRequest', schema: rejectAcceptanceRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 820, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/lane',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'lane', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#PrepareLaneRequest', schema: laneRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 236, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/publish',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'publish', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#PublishTicketGraphRequest', schema: publishRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 264, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/provisionLane',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'provisionLane', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#ProvisionLaneRequest', schema: provisionLaneRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 310, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/runLane',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'runLane', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#RunLaneRequest', schema: runLaneRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 355, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/prepareAcceptance',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'prepareAcceptance', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#PrepareAcceptanceRequest', schema: prepareAcceptanceRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 420, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/accept', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'accept', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#AcceptFlowRequest', schema: acceptRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 456, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/cleanup', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'cleanup', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#CleanupLaneRequest', schema: cleanupLaneRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 485, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/integrate', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'integrate', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#IntegrateLaneRequest', schema: integrateLaneRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 495, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/answerQuestion', service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'answerQuestion', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#AnswerQuestionRequest', schema: answerQuestionRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 535, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/resume',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'resume', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#ResumeFlowRequest', schema: resumeFlowRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 455, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/previewFrontier',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'previewFrontier', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#PreviewFrontierRequest', schema: frontierRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FrontierPlan', schema: frontierSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 480, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/startFrontier',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'startFrontier', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#StartFrontierRequest', schema: startFrontierRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 510, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/requestReview',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'requestReview', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#RequestReviewRequest', schema: reviewRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 485, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/disposeFinding',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'disposeFinding', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#DisposeFindingRequest', schema: disposeFindingRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 550, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/generateSpec',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'generateSpec', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#SpecRequest', schema: specRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 580, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/approveSpec',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'approveSpec', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#SpecRequest', schema: specRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 610, column: 3 },
    },
    {
      id: '@deepseek-ai/dsh-matt-skills-flow#mattSkillsFlow/exportEvidence',
      service: 'mattSkillsFlow', namespace: 'mattSkillsFlow', method: 'exportEvidence', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#ExportRequest', schema: exportRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-matt-skills-flow#FlowRecord', schema: flowSchema },
      cancellation: { parameter: 'signal' }, sourceLocation: { file: 'src/index.ts', line: 640, column: 3 },
    },
  ],
} satisfies TypertRemoteContribution

export default TYPERT_REMOTE
export const inject = ['remote']

export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  return await ctx.remote.$mount(TYPERT_REMOTE)
}

export interface FlowRemote {
  list(signal?: AbortSignal): Promise<RemoteResult<{ flows: FlowRecord[] }>>
  get(request: { flowId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  create(request: { title: string; repoRoot: string; workspaceId?: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  advance(request: { flowId: string; expectedRevision: number; action: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  decide(request: { flowId: string; expectedRevision: number; question: string; answer: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  ticket(request: { flowId: string; expectedRevision: number; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  updateTicket(request: { flowId: string; expectedRevision: number; ticketId: string; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  startActivity(request: { flowId: string; expectedRevision: number; kind: 'research' | 'prototype' | 'wayfinder'; question: string; expectedEvidence?: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  completeActivity(request: { flowId: string; expectedRevision: number; activityId: string; output: string; sourceRef: string; handoff?: 'to-grilling' | 'to-spec' | 'to-tickets' }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  rejectAcceptance(request: { flowId: string; expectedRevision: number; candidateArtifactId: string; reason: string; returnTo: 'grilling' | 'wayfinding' | 'ticketing' }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  lane(request: { flowId: string; expectedRevision: number; ticketId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  publish(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  provisionLane(request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  runLane(request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  prepareAcceptance(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  accept(request: { flowId: string; expectedRevision: number; candidateArtifactId: string; accept: true }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  cleanup(request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  integrate(request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  answerQuestion(request: { flowId: string; expectedRevision: number; questionId: string; answer: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  resume(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  previewFrontier(request: { flowId: string }, signal?: AbortSignal): Promise<RemoteResult<import('./domain.ts').FrontierPlan>>
  startFrontier(request: { flowId: string; expectedRevision: number; maxConcurrent?: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  requestReview(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  disposeFinding(request: { flowId: string; expectedRevision: number; findingId: string; kind: 'fixed' | 'rejected' | 'deferred'; reason: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  generateSpec(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  approveSpec(request: { flowId: string; expectedRevision: number }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
  exportEvidence(request: { flowId: string }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$6d617474536b696c6c73466c6f77 {
    list: (signal?: AbortSignal) => Promise<RemoteResult<{ flows: FlowRecord[] }>>
    get: (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    create: (request: { title: string; repoRoot: string; workspaceId?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    advance: (request: { flowId: string; expectedRevision: number; action: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    decide: (request: { flowId: string; expectedRevision: number; question: string; answer: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    ticket: (request: { flowId: string; expectedRevision: number; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    updateTicket: (request: { flowId: string; expectedRevision: number; ticketId: string; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    startActivity: (request: { flowId: string; expectedRevision: number; kind: 'research' | 'prototype' | 'wayfinder'; question: string; expectedEvidence?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    completeActivity: (request: { flowId: string; expectedRevision: number; activityId: string; output: string; sourceRef: string; handoff?: 'to-grilling' | 'to-spec' | 'to-tickets' }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    rejectAcceptance: (request: { flowId: string; expectedRevision: number; candidateArtifactId: string; reason: string; returnTo: 'grilling' | 'wayfinding' | 'ticketing' }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    lane: (request: { flowId: string; expectedRevision: number; ticketId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    publish: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    provisionLane: (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    runLane: (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    prepareAcceptance: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    accept: (request: { flowId: string; expectedRevision: number; candidateArtifactId: string; accept: true }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    cleanup: (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    integrate: (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    answerQuestion: (request: { flowId: string; expectedRevision: number; questionId: string; answer: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    resume: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    previewFrontier: (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<import('./domain.ts').FrontierPlan>>
    startFrontier: (request: { flowId: string; expectedRevision: number; maxConcurrent?: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    requestReview: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    disposeFinding: (request: { flowId: string; expectedRevision: number; findingId: string; kind: 'fixed' | 'rejected' | 'deferred'; reason: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    generateSpec: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    approveSpec: (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    exportEvidence: (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
  }
  interface TypertRemoteMap {
    'mattSkillsFlow/list': (signal?: AbortSignal) => Promise<RemoteResult<{ flows: FlowRecord[] }>>
    'mattSkillsFlow/get': (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/create': (request: { title: string; repoRoot: string; workspaceId?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/advance': (request: { flowId: string; expectedRevision: number; action: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/decide': (request: { flowId: string; expectedRevision: number; question: string; answer: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/ticket': (request: { flowId: string; expectedRevision: number; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/updateTicket': (request: { flowId: string; expectedRevision: number; ticketId: string; title: string; dependsOn?: string[]; acceptanceCriteria?: string[]; workflowRole?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/startActivity': (request: { flowId: string; expectedRevision: number; kind: 'research' | 'prototype' | 'wayfinder'; question: string; expectedEvidence?: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/completeActivity': (request: { flowId: string; expectedRevision: number; activityId: string; output: string; sourceRef: string; handoff?: 'to-grilling' | 'to-spec' | 'to-tickets' }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/rejectAcceptance': (request: { flowId: string; expectedRevision: number; candidateArtifactId: string; reason: string; returnTo: 'grilling' | 'wayfinding' | 'ticketing' }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/lane': (request: { flowId: string; expectedRevision: number; ticketId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/publish': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/provisionLane': (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/runLane': (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/prepareAcceptance': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/accept': (request: { flowId: string; expectedRevision: number; candidateArtifactId: string; accept: true }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/cleanup': (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/integrate': (request: { flowId: string; expectedRevision: number; laneId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/answerQuestion': (request: { flowId: string; expectedRevision: number; questionId: string; answer: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/resume': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/previewFrontier': (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<import('./domain.ts').FrontierPlan>>
    'mattSkillsFlow/startFrontier': (request: { flowId: string; expectedRevision: number; maxConcurrent?: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/requestReview': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/disposeFinding': (request: { flowId: string; expectedRevision: number; findingId: string; kind: 'fixed' | 'rejected' | 'deferred'; reason: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/generateSpec': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/approveSpec': (request: { flowId: string; expectedRevision: number }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
    'mattSkillsFlow/exportEvidence': (request: { flowId: string }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>
  }
  interface TypertRemoteNamespaceMap {
    mattSkillsFlow: TypertRemoteNamespace$6d617474536b696c6c73466c6f77
  }
}
