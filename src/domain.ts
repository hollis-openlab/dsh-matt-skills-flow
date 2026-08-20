import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type { ArtifactRecord } from './artifacts.ts'

export type FlowId = string & { readonly __flowId: unique symbol }

export const FlowId = (value: string): FlowId => value as FlowId

export const FLOW_PHASES = [
  'intake',
  'grilling',
  'wayfinding',
  'researching',
  'prototyping',
  'spec-review',
  'spec-ready',
  'ticketing',
  'tickets-ready',
  'execution-preflight',
  'running',
  'needs-human',
  'review-admission',
  'reviewing',
  'remediation',
  'ready-for-acceptance',
  'accepted',
  'paused',
  'failed',
  'aborted',
] as const

export type FlowPhase = typeof FLOW_PHASES[number]

export const flowPhaseSchema = z.enum(FLOW_PHASES)

export const FLOW_ACTIONS = [
  'start-feature', 'start-large-effort', 'start-bug', 'start-research', 'start-prototype',
  'propose-spec', 'research-resolved', 'prototype-resolved', 'map-cleared-for-spec',
  'map-cleared-for-tickets', 'approve-spec', 'reject-spec', 'begin-ticketing', 'approve-graph',
  'reject-graph', 'request-frontier', 'approve-frontier', 'reject-frontier', 'question-created',
  'questions-answered', 'frontier-drained', 'admit-review', 'reject-admission', 'findings-require-fix',
  'closeout-ready', 'candidate-refrozen', 'accept', 'reject', 'pause', 'resume', 'fail', 'recover', 'abort',
] as const

export type FlowAction = typeof FLOW_ACTIONS[number]

export const flowActionSchema = z.enum(FLOW_ACTIONS)

export interface FlowTransition {
  readonly action: FlowAction
  readonly to: FlowPhase
}

export interface FrontierPlan {
  readonly flowId: FlowId
  readonly flowRevision: number
  readonly tickets: readonly string[]
  readonly maxConcurrent: number
  readonly maxDepth: number
  readonly maxTotalAgents: number
  readonly warnings: readonly string[]
}

export interface ReviewFinding {
  readonly id: string
  readonly axis: 'standards' | 'spec'
  readonly severity: 'blocking' | 'warning' | 'note'
  readonly title: string
  readonly explanation: string
  readonly disposition?: { readonly kind: 'fixed' | 'rejected' | 'deferred'; readonly reason: string }
}

export interface AcceptanceTrace {
  readonly ticketId: string
  readonly criterion: string
  readonly source: string
  readonly productionPath: string
  readonly falsifyingCase: string
  readonly observableSignal: string
  readonly status: 'covered' | 'missing' | 'deferred'
}

export function frontierFor(flow: Pick<FlowRecord, 'id' | 'revision' | 'tickets' | 'lanes'>, maxConcurrent: number): FrontierPlan {
  const terminal = new Set(['completed', 'integrated'] as const)
  const claimed = new Set(flow.lanes.filter(lane => ['running', 'blocked', 'completed', 'integrating', 'integrated'].includes(lane.status)).map(lane => lane.ticketId))
  const ticketState = new Map(flow.tickets.map(ticket => [ticket.id, ticket.status]))
  const tickets = flow.tickets
    .filter(ticket => !terminal.has(ticket.status as 'completed' | 'integrated'))
    .filter(ticket => !claimed.has(ticket.id))
    .filter(ticket => ticket.dependsOn.every(id => terminal.has(ticketState.get(id) as 'completed' | 'integrated')))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(ticket => ticket.id)
  const warnings = tickets.length === 0 && flow.tickets.length > 0 ? ['No Ticket is currently unblocked and unclaimed'] : []
  return { flowId: flow.id, flowRevision: flow.revision, tickets, maxConcurrent, maxDepth: 1, maxTotalAgents: maxConcurrent, warnings }
}

export type GateResult =
  | { readonly kind: 'pass'; readonly evidence: readonly string[] }
  | { readonly kind: 'needs-user'; readonly gate: string; readonly message: string }
  | { readonly kind: 'blocked'; readonly code: string; readonly message: string; readonly evidence: readonly string[] }

export function evaluateTransitionGate(flow: Pick<FlowRecord, 'phase' | 'skillSnapshot' | 'decisions' | 'tickets' | 'acceptance' | 'review'>, action: FlowAction): GateResult {
  switch (action) {
    case 'start-feature':
      return flow.skillSnapshot?.status === 'ready'
        ? { kind: 'pass', evidence: ['skill-snapshot:ready'] }
        : { kind: 'blocked', code: 'SKILL_SETUP_GATE', message: 'A complete Matt Skills snapshot is required before planning starts', evidence: [] }
    case 'approve-spec':
      return flow.decisions.length > 0
        ? { kind: 'pass', evidence: [`decisions:${flow.decisions.length}`] }
        : { kind: 'needs-user', gate: 'decision-ledger', message: 'Confirm at least one planning decision before approving the Spec' }
    case 'approve-graph':
      return flow.tickets.length > 0
        ? { kind: 'pass', evidence: [`tickets:${flow.tickets.length}`] }
        : { kind: 'blocked', code: 'TICKET_GRAPH_EMPTY', message: 'The Ticket Graph must contain at least one Ticket', evidence: [] }
    case 'approve-frontier':
      return flow.tickets.length > 0
        ? { kind: 'pass', evidence: [`frontier:tickets-${flow.tickets.length}`] }
        : { kind: 'blocked', code: 'FRONTIER_EMPTY', message: 'The executable Frontier is empty', evidence: [] }
    case 'accept':
      return flow.acceptance?.status === 'ready' && flow.review?.status === 'complete' && !(flow.review.findings ?? []).some(finding => finding.severity !== 'note' && finding.disposition === undefined)
        ? { kind: 'pass', evidence: ['acceptance:ready'] }
        : { kind: 'needs-user', gate: 'review', message: 'Complete both review axes and resolve all blocking or warning findings before acceptance' }
    default:
      return { kind: 'pass', evidence: [] }
  }
}

type TransitionTarget = FlowPhase | 'prior-planning-phase' | 'selected-phase'

const TRANSITION_TABLE: Readonly<Record<string, readonly { action: FlowAction; to: TransitionTarget }[]>> = {
  intake: [
    { action: 'start-feature', to: 'grilling' },
    { action: 'start-large-effort', to: 'wayfinding' },
    { action: 'start-bug', to: 'researching' },
  ],
  grilling: [
    { action: 'start-research', to: 'researching' },
    { action: 'start-prototype', to: 'prototyping' },
    { action: 'propose-spec', to: 'spec-review' },
  ],
  researching: [{ action: 'research-resolved', to: 'prior-planning-phase' }],
  prototyping: [{ action: 'prototype-resolved', to: 'prior-planning-phase' }],
  wayfinding: [
    { action: 'map-cleared-for-spec', to: 'spec-review' },
    { action: 'map-cleared-for-tickets', to: 'ticketing' },
  ],
  'spec-review': [
    { action: 'approve-spec', to: 'spec-ready' },
    { action: 'reject-spec', to: 'grilling' },
  ],
  'spec-ready': [{ action: 'begin-ticketing', to: 'ticketing' }],
  ticketing: [
    { action: 'approve-graph', to: 'tickets-ready' },
    { action: 'reject-graph', to: 'ticketing' },
  ],
  'tickets-ready': [{ action: 'request-frontier', to: 'execution-preflight' }],
  'execution-preflight': [
    { action: 'approve-frontier', to: 'running' },
    { action: 'reject-frontier', to: 'tickets-ready' },
  ],
  running: [
    { action: 'question-created', to: 'needs-human' },
    { action: 'frontier-drained', to: 'review-admission' },
  ],
  'needs-human': [{ action: 'questions-answered', to: 'running' }],
  'review-admission': [
    { action: 'admit-review', to: 'reviewing' },
    { action: 'reject-admission', to: 'running' },
  ],
  reviewing: [
    { action: 'findings-require-fix', to: 'remediation' },
    { action: 'closeout-ready', to: 'ready-for-acceptance' },
  ],
  remediation: [{ action: 'candidate-refrozen', to: 'reviewing' }],
  'ready-for-acceptance': [
    { action: 'accept', to: 'accepted' },
    { action: 'reject', to: 'selected-phase' },
  ],
}

const WILDCARD_TRANSITIONS: readonly { action: FlowAction; to: TransitionTarget }[] = [
  { action: 'pause', to: 'paused' },
  { action: 'fail', to: 'failed' },
  { action: 'abort', to: 'aborted' },
]

export function transitionsFor(phase: FlowPhase): readonly FlowAction[] {
  return [...(TRANSITION_TABLE[phase] ?? []), ...WILDCARD_TRANSITIONS]
    .map(transition => transition.action)
}

export function transitionFor(flow: Pick<FlowRecord, 'phase' | 'pausedFrom' | 'planningReturnPhase'>, action: FlowAction): FlowTransition | undefined {
  if (action === 'resume' && flow.phase === 'paused' && flow.pausedFrom !== undefined) {
    return { action, to: flow.pausedFrom }
  }
  const spec = [...(TRANSITION_TABLE[flow.phase] ?? []), ...WILDCARD_TRANSITIONS]
    .find(candidate => candidate.action === action)
  if (spec === undefined) return undefined
  if (spec.to === 'prior-planning-phase') {
    if (flow.planningReturnPhase === undefined) return undefined
    return { action, to: flow.planningReturnPhase }
  }
  if (spec.to === 'selected-phase') return undefined
  return { action, to: spec.to }
}

export function defaultTransitionFor(flow: Pick<FlowRecord, 'phase' | 'pausedFrom' | 'planningReturnPhase'>): FlowTransition | undefined {
  const action = (TRANSITION_TABLE[flow.phase] ?? [])[0]?.action
  return action === undefined ? undefined : transitionFor(flow, action)
}

export interface DecisionRecord {
  readonly id: string
  readonly question: string
  readonly answer: string
  readonly status: 'active' | 'superseded'
  readonly createdAt: number
  readonly supersededBy?: string
}

export interface TicketRecord {
  readonly id: string
  readonly title: string
  readonly status: 'open' | 'blocked' | 'running' | 'completed' | 'failed' | 'integrated'
  readonly blockedBy: readonly string[]
  readonly dependsOn: readonly string[]
  readonly acceptanceCriteria?: readonly string[]
  readonly workflowRole?: string
}

export interface LaneRecord {
  readonly id: string
  readonly ticketId: string
  readonly status: 'preparing' | 'ready' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'integrating' | 'integrated'
  readonly branch?: string
  readonly worktreePath?: string
  readonly baseCommit?: string
  readonly packetArtifactId?: string
  readonly packetSha256?: string
  readonly commit?: string
  readonly resultArtifactId?: string
  readonly resultSha256?: string
  readonly resultSummary?: string
  readonly cleanedAt?: number
  readonly updatedAt: number
}

export interface QuestionRecord {
  readonly id: string
  readonly ticketId?: string
  readonly question: string
  readonly status: 'pending' | 'answered' | 'dismissed'
  readonly createdAt: number
  readonly answer?: string
}

export type ActivityKind = 'research' | 'prototype' | 'wayfinder'

export interface ActivityRecord {
  readonly id: string
  readonly kind: ActivityKind
  readonly question: string
  readonly expectedEvidence?: string
  readonly status: 'open' | 'completed' | 'cancelled'
  readonly output?: string
  readonly sourceRef?: string
  readonly handoff?: 'to-grilling' | 'to-spec' | 'to-tickets'
  readonly createdAt: number
  readonly completedAt?: number
}

export interface FlowRecord {
  readonly schemaVersion: 1
  readonly id: FlowId
  readonly revision: number
  readonly title: string
  readonly workspaceId?: WorkspaceId
  readonly repoRoot: string
  readonly rootSessionId?: string
  readonly phase: FlowPhase
  readonly pausedFrom?: FlowPhase
  readonly planningReturnPhase?: 'intake' | 'grilling' | 'wayfinding'
  readonly nextAction: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly decisions: readonly DecisionRecord[]
  readonly tickets: readonly TicketRecord[]
  readonly lanes: readonly LaneRecord[]
  readonly questions: readonly QuestionRecord[]
  readonly activities?: readonly ActivityRecord[]
  readonly artifacts: readonly ArtifactRecord[]
  readonly tracker?: {
    readonly kind: 'local' | 'github'
    readonly root?: string
    readonly repository?: string
    readonly graphPath: string
    readonly graphSha256: string
    readonly issueNumbers?: readonly number[]
    readonly issueUrls?: readonly string[]
    readonly publishedAt: number
  }
  readonly integration?: {
    readonly branch: string
    readonly worktreePath: string
    readonly baseCommit: string
    readonly headCommit: string
  }
  readonly spec?: { readonly status: 'draft' | 'approved' | 'stale'; readonly artifactId: string; readonly sha256: string; readonly createdAt: number; readonly approvedAt?: number }
  readonly export?: { readonly artifactId: string; readonly sha256: string; readonly createdAt: number }
  readonly review?: {
    readonly candidateArtifactId: string
    readonly candidateSha256: string
    readonly admissionArtifactId?: string
    readonly admissionSha256?: string
    readonly fixedPoint: string
    readonly createdAt: number
    readonly status?: 'frozen' | 'running' | 'complete' | 'failed'
    readonly round?: number
    readonly findings?: readonly ReviewFinding[]
  }
  readonly recovery?: {
    readonly status: 'clean' | 'required' | 'reconciled'
    readonly reason?: string
    readonly observedAt: number
  }
  readonly skillSnapshot?: {
    readonly status: 'missing' | 'ready' | 'unknown'
    readonly count: number
    readonly names?: readonly string[]
    readonly missing?: readonly string[]
    readonly entries?: readonly SkillSnapshotEntry[]
    readonly aggregateSha256?: string
  }
  readonly acceptance?: {
    readonly status: 'not-ready' | 'ready' | 'accepted' | 'rejected'
    readonly candidateCommit?: string
    readonly receiptArtifactId?: string
    readonly acceptedAt?: number
    readonly acceptedBy?: 'local-user'
  }
}

export interface SkillSnapshotEntry {
  readonly name: string
  readonly provider: string
  readonly source: string
  readonly invocation: { readonly modelInvocable: boolean; readonly userInvocable: boolean }
  readonly contentSha256: string
}

const decisionSchema = z.object({
  id: z.string(), question: z.string(), answer: z.string(), status: z.enum(['active', 'superseded']),
  createdAt: z.number(), supersededBy: z.string().optional(),
}).strict()

const ticketSchema = z.object({
  id: z.string(), title: z.string(), status: z.enum(['open', 'blocked', 'running', 'completed', 'failed', 'integrated']),
  blockedBy: z.array(z.string()), dependsOn: z.array(z.string()), acceptanceCriteria: z.array(z.string()).optional(), workflowRole: z.string().optional(),
}).strict()

/** Validate dependency edges and reject unknown nodes or cycles before publication. */
export function validateTicketGraph(tickets: readonly Pick<TicketRecord, 'id' | 'dependsOn'>[]): void {
  const known = new Set(tickets.map(ticket => ticket.id))
  for (const ticket of tickets) {
    for (const dependency of ticket.dependsOn) if (!known.has(dependency)) throw new Error(`TICKET_DEPENDENCY_UNKNOWN: ${dependency}`)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const byId = new Map(tickets.map(ticket => [ticket.id, ticket]))
  const visit = (id: string): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) throw new Error(`TICKET_GRAPH_CYCLE: dependency cycle includes ${id}`)
    visiting.add(id)
    for (const dependency of byId.get(id)?.dependsOn ?? []) visit(dependency)
    visiting.delete(id)
    visited.add(id)
  }
  for (const ticket of tickets) visit(ticket.id)
}

const laneSchema = z.object({
  id: z.string(), ticketId: z.string(),
  status: z.enum(['preparing', 'ready', 'running', 'blocked', 'completed', 'failed', 'cancelled', 'integrating', 'integrated']),
  branch: z.string().optional(), worktreePath: z.string().optional(), baseCommit: z.string().optional(), packetArtifactId: z.string().optional(), packetSha256: z.string().optional(), commit: z.string().optional(), resultArtifactId: z.string().optional(), resultSha256: z.string().optional(), resultSummary: z.string().optional(), cleanedAt: z.number().optional(), updatedAt: z.number(),
}).strict()

const questionSchema = z.object({
  id: z.string(), ticketId: z.string().optional(), question: z.string(),
  status: z.enum(['pending', 'answered', 'dismissed']), createdAt: z.number(), answer: z.string().optional(),
}).strict()

const activitySchema = z.object({
  id: z.string(), kind: z.enum(['research', 'prototype', 'wayfinder']), question: z.string(), expectedEvidence: z.string().optional(),
  status: z.enum(['open', 'completed', 'cancelled']), output: z.string().optional(), sourceRef: z.string().optional(),
  handoff: z.enum(['to-grilling', 'to-spec', 'to-tickets']).optional(), createdAt: z.number(), completedAt: z.number().optional(),
}).strict()

export const flowRecordSchema = z.object({
  schemaVersion: z.literal(1), id: z.string(), revision: z.number().int().positive(), title: z.string(),
  workspaceId: z.string().optional(), repoRoot: z.string(), rootSessionId: z.string().optional(), phase: flowPhaseSchema, pausedFrom: flowPhaseSchema.optional(), planningReturnPhase: z.enum(['intake', 'grilling', 'wayfinding']).optional(), nextAction: z.string(),
  createdAt: z.number(), updatedAt: z.number(), decisions: z.array(decisionSchema), tickets: z.array(ticketSchema),
  lanes: z.array(laneSchema), questions: z.array(questionSchema),
  activities: z.array(activitySchema).optional(),
  artifacts: z.array(z.object({
    id: z.string(), kind: z.enum(['decision', 'ticket', 'lane', 'packet', 'review', 'spec', 'export', 'acceptance']), mediaType: z.string(), sha256: z.string(),
    size: z.number().int().nonnegative(), relativePath: z.string(), createdAt: z.number(),
  }).strict()).default([]),
  tracker: z.union([
    z.object({ kind: z.literal('local'), root: z.string(), graphPath: z.string(), graphSha256: z.string(), publishedAt: z.number() }).strict(),
    z.object({ kind: z.literal('github'), repository: z.string(), graphPath: z.string(), graphSha256: z.string(), issueNumbers: z.array(z.number().int().positive()), issueUrls: z.array(z.string().url()), publishedAt: z.number() }).strict(),
  ]).optional(),
  integration: z.object({ branch: z.string(), worktreePath: z.string(), baseCommit: z.string(), headCommit: z.string() }).strict().optional(),
  skillSnapshot: z.object({
    status: z.enum(['missing', 'ready', 'unknown']),
    count: z.number().int().nonnegative(),
    names: z.array(z.string()).optional(),
    missing: z.array(z.string()).optional(),
    entries: z.array(z.object({
      name: z.string(), provider: z.string(), source: z.string(),
      invocation: z.object({ modelInvocable: z.boolean(), userInvocable: z.boolean() }).strict(),
      contentSha256: z.string(),
    }).strict()).optional(),
    aggregateSha256: z.string().optional(),
  }).strict().optional(),
  review: z.object({
    candidateArtifactId: z.string(), candidateSha256: z.string(), fixedPoint: z.string(), createdAt: z.number(),
    status: z.enum(['frozen', 'running', 'complete', 'failed']).optional(), round: z.number().int().nonnegative().optional(),
    findings: z.array(z.object({ id: z.string(), axis: z.enum(['standards', 'spec']), severity: z.enum(['blocking', 'warning', 'note']), title: z.string(), explanation: z.string(), disposition: z.object({ kind: z.enum(['fixed', 'rejected', 'deferred']), reason: z.string() }).strict().optional() }).strict()).optional(),
  }).strict().optional(),
  spec: z.object({ status: z.enum(['draft', 'approved', 'stale']), artifactId: z.string(), sha256: z.string(), createdAt: z.number(), approvedAt: z.number().optional() }).strict().optional(),
  export: z.object({ artifactId: z.string(), sha256: z.string(), createdAt: z.number() }).strict().optional(),
  recovery: z.object({ status: z.enum(['clean', 'required', 'reconciled']), reason: z.string().optional(), observedAt: z.number() }).strict().optional(),
  acceptance: z.object({ status: z.enum(['not-ready', 'ready', 'accepted', 'rejected']), candidateCommit: z.string().optional(), receiptArtifactId: z.string().optional(), acceptedAt: z.number().optional(), acceptedBy: z.literal('local-user').optional() }).strict().optional(),
}).strict()

export const mattSkillsFlowDomain = defineDomain({
  name: 'matt_skills_flow',
  version: 1,
  tables: {
    flows: domainTable<FlowId, FlowRecord>(flowRecordSchema as unknown as z.ZodType<FlowRecord>),
  },
})

export function nextActionFor(phase: FlowPhase): string {
  switch (phase) {
    case 'intake': return 'Start planning with grill-with-docs'
    case 'grilling': return 'Continue the decision round'
    case 'spec-review': return 'Review and approve the Spec'
    case 'spec-ready': return 'Create tracer-bullet Tickets'
    case 'ticketing': return 'Review the Ticket Graph'
    case 'tickets-ready': return 'Preview the executable Frontier'
    case 'execution-preflight': return 'Approve Lane execution'
    case 'running': return 'Monitor active Lanes'
    case 'needs-human': return 'Answer blocked Questions'
    case 'review-admission': return 'Check review admission'
    case 'reviewing': return 'Review Standards and Spec findings'
    case 'remediation': return 'Run the bounded remediation round'
    case 'ready-for-acceptance': return 'Accept or reject the candidate'
    case 'accepted': return 'Flow accepted'
    case 'paused': return 'Resume the Flow'
    case 'failed': return 'Inspect recovery details'
    case 'aborted': return 'Flow aborted'
    case 'wayfinding': return 'Resolve the next decision ticket'
    case 'researching': return 'Collect the required research evidence'
    case 'prototyping': return 'Run the prototype decision'
  }
}

export function nextPhaseFor(phase: FlowPhase): FlowPhase | undefined {
  switch (phase) {
    case 'intake': return 'grilling'
    case 'grilling': return 'spec-review'
    case 'spec-review': return 'spec-ready'
    case 'spec-ready': return 'ticketing'
    case 'ticketing': return 'tickets-ready'
    case 'tickets-ready': return 'execution-preflight'
    case 'execution-preflight': return 'running'
    case 'running': return 'review-admission'
    case 'review-admission': return 'reviewing'
    case 'reviewing': return 'ready-for-acceptance'
    case 'remediation': return 'reviewing'
    case 'ready-for-acceptance': return 'accepted'
    default: return undefined
  }
}

export function createFlowRecord(input: {
  id: FlowId
  title: string
  repoRoot: string
  rootSessionId?: string
  workspaceId?: WorkspaceId
  now: number
}): FlowRecord {
  return {
    schemaVersion: 1,
    id: input.id,
    revision: 1,
    title: input.title,
    ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
    repoRoot: input.repoRoot,
    ...(input.rootSessionId === undefined ? {} : { rootSessionId: input.rootSessionId }),
    phase: 'intake',
    nextAction: nextActionFor('intake'),
    createdAt: input.now,
    updatedAt: input.now,
    decisions: [],
    tickets: [],
    lanes: [],
    questions: [],
    activities: [],
    artifacts: [],
    skillSnapshot: { status: 'unknown', count: 0 },
    acceptance: { status: 'not-ready' },
    recovery: { status: 'clean', observedAt: input.now },
  }
}
