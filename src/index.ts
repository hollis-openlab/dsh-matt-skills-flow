import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { CommandDefinition, CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-commands'
import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { createMessage } from '@deepseek-ai/dsh-llm'
import { WorkspaceId, type WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-agent-presets'
import type {} from '@deepseek-ai/dsh-subagent'
import { renderSkillContent, type SkillDefinition } from '@deepseek-ai/dsh-skill'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { FlowRecord } from './domain.ts'
import { createFlowRecord, evaluateTransitionGate, FlowId, frontierFor, nextActionFor, transitionFor, validateTicketGraph, flowActionSchema, type AcceptanceTrace, type FlowAction, type FrontierPlan, type ReviewFinding, type SkillSnapshotEntry } from './domain.ts'
import { FlowRepository } from './storage.ts'
import { ArtifactStore, type ArtifactRecord } from './artifacts.ts'
import { GitHubTracker, LocalTracker, type TrackerAdapter, type TrackerRecord } from './tracker.ts'
import { GitRunner } from './git.ts'
import { continueActionFor, parseMattFlowCommand } from './commands.ts'

export const name = 'dsh-matt-skills-flow'
export const inject = ['agentDefaultModel', 'agentPresets', 'agents', 'commands', 'skills', 'storageDomain', 'subagents', 'subprocess', 'workspaceRegistry']

export interface MattSkillsFlowConfig {
  readonly trackerKind: 'local' | 'github'
  readonly githubRepository?: string
  readonly defaultMaxConcurrentLanes: number
  readonly hardMaxConcurrentLanes: number
  readonly worktreeRootName: string
  readonly requiredSkills: string[]
  readonly artifactRoot: string
  readonly maxArtifactBytes: number
  readonly laneSubagentProvider: string
  readonly laneTimeoutMs: number
  readonly laneMaxTokens: number
  readonly laneMaxDepth: number
  readonly reviewTimeoutMs: number
  readonly defaultMaxReviewRounds: number
  readonly hardMaxReviewRounds: number
  readonly reviewAgentPreset: string
}

const DEFAULT_CONFIG: MattSkillsFlowConfig = {
  trackerKind: 'local',
  githubRepository: '',
  defaultMaxConcurrentLanes: 1,
  hardMaxConcurrentLanes: 4,
  worktreeRootName: '.dsh-worktrees/matt-flow',
  requiredSkills: [
    'setup-matt-pocock-skills', 'ask-matt', 'grill-with-docs', 'grilling', 'domain-modeling',
    'research', 'prototype', 'wayfinder', 'to-spec', 'to-tickets', 'implement', 'tdd',
    'codebase-design', 'code-review', 'diagnosing-bugs', 'resolving-merge-conflicts',
  ],
  artifactRoot: dshHomePath('matt-skills-flow', 'artifacts'),
  maxArtifactBytes: 1024 * 1024,
  laneSubagentProvider: 'spawn',
  laneTimeoutMs: 5 * 60 * 1000,
  laneMaxTokens: 8192,
  laneMaxDepth: 1,
  reviewTimeoutMs: 4 * 60 * 1000,
  defaultMaxReviewRounds: 1,
  hardMaxReviewRounds: 2,
  reviewAgentPreset: 'minimal',
}

export const Config: z<MattSkillsFlowConfig> = z.object({
  trackerKind: z.union([z.const('local'), z.const('github')]).default(DEFAULT_CONFIG.trackerKind),
  githubRepository: z.string().default(DEFAULT_CONFIG.githubRepository ?? ''),
  defaultMaxConcurrentLanes: z.number().step(1).min(1).default(DEFAULT_CONFIG.defaultMaxConcurrentLanes),
  hardMaxConcurrentLanes: z.number().step(1).min(1).default(DEFAULT_CONFIG.hardMaxConcurrentLanes),
  worktreeRootName: z.string().default(DEFAULT_CONFIG.worktreeRootName),
  requiredSkills: z.array(z.string()).default(DEFAULT_CONFIG.requiredSkills),
  artifactRoot: z.string().default(DEFAULT_CONFIG.artifactRoot),
  maxArtifactBytes: z.number().step(1).min(1).default(DEFAULT_CONFIG.maxArtifactBytes),
  laneSubagentProvider: z.string().default(DEFAULT_CONFIG.laneSubagentProvider),
  laneTimeoutMs: z.number().step(1).min(1000).default(DEFAULT_CONFIG.laneTimeoutMs),
  laneMaxTokens: z.number().step(1).min(1024).default(DEFAULT_CONFIG.laneMaxTokens),
  laneMaxDepth: z.number().step(1).min(0).default(DEFAULT_CONFIG.laneMaxDepth),
  reviewTimeoutMs: z.number().step(1).min(1000).default(DEFAULT_CONFIG.reviewTimeoutMs),
  defaultMaxReviewRounds: z.number().step(1).min(1).default(DEFAULT_CONFIG.defaultMaxReviewRounds),
  hardMaxReviewRounds: z.number().step(1).min(1).default(DEFAULT_CONFIG.hardMaxReviewRounds),
  reviewAgentPreset: z.string().default(DEFAULT_CONFIG.reviewAgentPreset),
})

export interface CreateFlowRequest {
  readonly title: string
  readonly repoRoot: string
  readonly workspaceId?: string
}

export interface GetFlowRequest {
  readonly flowId: string
}

export interface AdvanceFlowRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly action: string
}

export interface RecordDecisionRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly question: string
  readonly answer: string
}

export interface CreateTicketRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly title: string
  readonly dependsOn?: readonly string[]
  readonly acceptanceCriteria?: readonly string[]
  readonly workflowRole?: string
}

export interface UpdateTicketRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly ticketId: string
  readonly title: string
  readonly dependsOn?: readonly string[]
  readonly acceptanceCriteria?: readonly string[]
  readonly workflowRole?: string
}

export interface StartActivityRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly kind: 'research' | 'prototype' | 'wayfinder'
  readonly question: string
  readonly expectedEvidence?: string
}

export interface CompleteActivityRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly activityId: string
  readonly output: string
  readonly sourceRef: string
  readonly handoff?: 'to-grilling' | 'to-spec' | 'to-tickets'
}

export interface PrepareLaneRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly ticketId: string
}

export interface PublishTicketGraphRequest {
  readonly flowId: string
  readonly expectedRevision: number
}

export interface ProvisionLaneRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly laneId: string
}

export interface RunLaneRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly laneId: string
}

export interface PrepareAcceptanceRequest {
  readonly flowId: string
  readonly expectedRevision: number
}

export interface PreviewFrontierRequest {
  readonly flowId: string
}

export interface StartFrontierRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly confirmedConcurrency: true
  readonly maxConcurrent?: number
}

export interface RequestReviewRequest {
  readonly flowId: string
  readonly expectedRevision: number
}

export interface DisposeFindingRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly findingId: string
  readonly kind: 'fixed' | 'rejected' | 'deferred'
  readonly reason: string
}

export interface SpecRequest {
  readonly flowId: string
  readonly expectedRevision: number
}

export interface ExportRequest {
  readonly flowId: string
}

export interface AcceptFlowRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly candidateArtifactId: string
  readonly accept: true
}

export interface RejectAcceptanceRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly candidateArtifactId: string
  readonly reason: string
  readonly returnTo: 'grilling' | 'wayfinding' | 'ticketing'
}

export interface CleanupLaneRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly laneId: string
}

export interface IntegrateLaneRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly laneId: string
}

export interface AnswerQuestionRequest {
  readonly flowId: string
  readonly expectedRevision: number
  readonly questionId: string
  readonly answer: string
}

export interface FlowListResult {
  readonly flows: readonly FlowRecord[]
}

/** Host service for the first durable Flow vertical slice. */
export class MattSkillsFlowService extends TypertRemoteService {
  static inject = ['agentDefaultModel', 'agentPresets', 'agents', 'commands', 'skills', 'storageDomain', 'subagents', 'subprocess', 'workspaceRegistry']
  static Config = Config

  private readonly config: MattSkillsFlowConfig
  private readonly repository: FlowRepository
  private readonly workspaceRegistry: WorkspaceRegistry
  private readonly artifactStore: ArtifactStore
  private readonly tracker: TrackerAdapter
  private readonly git: GitRunner
  private readonly flowHandles = new Map<FlowId, { dispose(): Promise<void> }>()
  private readonly reviewHandles = new Map<FlowId, AgentHandle>()
  private readonly integrationPromises = new Map<FlowId, Promise<FlowRecord>>()

  constructor(ctx: Context, config: Partial<MattSkillsFlowConfig> = {}) {
    super(ctx, 'mattSkillsFlow')
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.repository = new FlowRepository(ctx)
    this.workspaceRegistry = ctx.workspaceRegistry
    this.artifactStore = new ArtifactStore(this.config.artifactRoot, this.config.maxArtifactBytes)
    this.tracker = this.config.trackerKind === 'github' ? new GitHubTracker(ctx.subprocess, this.config.githubRepository) : new LocalTracker()
    this.git = new GitRunner(ctx.subprocess)
  }

  protected async [Service.init](): Promise<void> {
    if (this.config.defaultMaxConcurrentLanes > this.config.hardMaxConcurrentLanes) {
      throw new Error('defaultMaxConcurrentLanes cannot exceed hardMaxConcurrentLanes')
    }
    if (this.config.defaultMaxReviewRounds > this.config.hardMaxReviewRounds) throw new Error('defaultMaxReviewRounds cannot exceed hardMaxReviewRounds')
    await this.repository.open()
    for (const flow of this.repository.list()) {
      const interruptedLanes = flow.lanes.filter(lane => lane.status === 'running' || lane.status === 'integrating')
      const integrationStatus = flow.integration === undefined ? '' : await this.git.status(flow.integration.worktreePath).catch(() => 'RECOVERY_REQUIRED: integration worktree unavailable')
      if (interruptedLanes.length === 0 && flow.review?.status !== 'running' && integrationStatus.length === 0) continue
      const reason = [
        interruptedLanes.length > 0 ? `lane-interrupted:${interruptedLanes.map(lane => lane.id).join(',')}` : '',
        flow.review?.status === 'running' ? 'review-interrupted' : '',
        integrationStatus.length > 0 ? 'integration-worktree-dirty-or-unavailable' : '',
      ].filter(Boolean).join(';')
      await this.repository.update(flow.id, flow.revision, current => ({
        ...current,
        revision: current.revision + 1,
        lanes: current.lanes.map(lane => lane.status === 'running' || lane.status === 'integrating'
          ? { ...lane, status: 'failed' as const, resultSummary: lane.status === 'integrating' ? 'RECOVERY_REQUIRED: Lane integration was interrupted by Host restart' : 'RECOVERY_REQUIRED: Lane Agent was interrupted by Host restart', updatedAt: Date.now() }
          : lane),
        review: current.review?.status === 'running' ? { ...current.review, status: 'failed' as const } : current.review,
        recovery: { status: 'required' as const, reason, observedAt: Date.now() },
        updatedAt: Date.now(),
      }))
    }
    this.ctx.effect(() => () => {
      for (const handle of this.flowHandles.values()) void handle.dispose()
      this.flowHandles.clear()
      for (const handle of this.reviewHandles.values()) void handle.dispose()
      this.reviewHandles.clear()
      this.integrationPromises.clear()
    }, 'matt-skills-flow: agent teardown')
    this.ctx.effect(() => this.ctx.commands.register(this.commandDefinition()), 'matt-skills-flow: /matt-flow command')
  }

  /** Register the root-user command surface over the same durable methods as the Web UI. */
  private commandDefinition(): CommandDefinition {
    return {
      name: 'matt-flow',
      description: 'Run a Matt Skills Flow command',
      input: { hint: 'start <title> | list | status <flow> | continue <flow> | pause <flow> | resume <flow> | questions <flow> | export <flow> | abort <flow>' },
      handler: invocation => this.executeCommand(invocation),
    }
  }

  private async executeCommand(invocation: CommandInvocation): Promise<CommandResult> {
    const input = parseMattFlowCommand(invocation.rawInput)
    switch (input.verb) {
      case 'start': {
        if (input.argument.length === 0) throw new Error('MATT_FLOW_USAGE: /matt-flow start <title>')
        const repoRoot = invocation.agent.session.header.cwd ?? this.workspaceRegistry.list()[0]?.path
        if (repoRoot === undefined) throw new Error('MATT_FLOW_REPOSITORY_REQUIRED: open a workspace before starting a Flow')
        const flow = await this.create({ title: input.argument, repoRoot })
        return { kind: 'success', text: `Flow ${flow.id} created in ${flow.phase}` }
      }
      case 'list': {
        const flows = this.list().flows
        return { kind: 'success', text: flows.length === 0
          ? 'No Matt Skills Flows'
          : flows.map(flow => `${flow.id} · ${flow.phase} · ${flow.title}`).join('\n') }
      }
      case 'status': {
        const flow = this.resolveCommandFlow(input.argument)
        return { kind: 'success', text: this.formatCommandFlow(flow) }
      }
      case 'continue': {
        const flow = this.resolveCommandFlow(input.argument)
        const action = continueActionFor(flow.phase)
        if (action === undefined) throw new Error(`MATT_FLOW_CONTINUE_EXPLICIT: ${flow.phase} needs a specific UI decision`)
        const next = await this.advance({ flowId: flow.id, expectedRevision: flow.revision, action })
        return { kind: 'success', text: this.formatCommandFlow(next) }
      }
      case 'pause':
      case 'resume':
      case 'abort': {
        const flow = this.resolveCommandFlow(input.argument)
        const next = await this.advance({ flowId: flow.id, expectedRevision: flow.revision, action: input.verb })
        return { kind: 'success', text: this.formatCommandFlow(next) }
      }
      case 'questions': {
        const flow = this.resolveCommandFlow(input.argument)
        const questions = flow.questions.filter(question => question.status === 'pending')
        return { kind: 'success', text: questions.length === 0
          ? 'No pending questions'
          : questions.map(question => `${question.id} · ${question.question}`).join('\n') }
      }
      case 'export': {
        const flow = this.resolveCommandFlow(input.argument)
        const exported = await this.exportEvidence({ flowId: flow.id })
        return { kind: 'success', text: `Evidence export ${exported.export?.artifactId ?? 'created'}` }
      }
      default:
        throw new Error('MATT_FLOW_USAGE: /matt-flow start|list|status|continue|pause|resume|questions|export|abort')
    }
  }

  private resolveCommandFlow(reference: string): FlowRecord {
    const flows = this.repository.list()
    const needle = reference.trim()
    if (needle.length === 0) {
      if (flows.length === 1 && flows[0] !== undefined) return flows[0]
      throw new Error('MATT_FLOW_REFERENCE_REQUIRED: provide a Flow id or quoted title')
    }
    const exact = flows.filter(flow => flow.id === needle || flow.title === needle)
    if (exact.length === 1 && exact[0] !== undefined) return exact[0]
    const prefix = flows.filter(flow => flow.id.startsWith(needle))
    if (prefix.length === 1 && prefix[0] !== undefined) return prefix[0]
    if (exact.length > 1 || prefix.length > 1) throw new Error(`MATT_FLOW_AMBIGUOUS: ${flows.filter(flow => flow.id.startsWith(needle) || flow.title === needle).map(flow => flow.id).join(', ')}`)
    throw new Error(`FLOW_NOT_FOUND: ${needle}`)
  }

  private formatCommandFlow(flow: FlowRecord): string {
    return `${flow.id} · ${flow.phase} · revision ${flow.revision}\n${flow.title}\nNext: ${flow.nextAction}`
  }

  /** List bounded Flow summaries for the current Host. */
  @Remote('list')
  list(): FlowListResult {
    return { flows: this.repository.list().slice(0, 128) }
  }

  /** Read one durable Flow. */
  @Remote('get')
  get(request: GetFlowRequest): FlowRecord {
    const flow = this.repository.get(FlowId(request.flowId))
    if (flow === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    return flow
  }

  /** Create an intake Flow bound to an existing Workspace or repository root. */
  @Remote('create')
  async create(request: CreateFlowRequest): Promise<FlowRecord> {
    const title = request.title.trim()
    const repoRoot = request.repoRoot.trim()
    if (title.length === 0) throw new Error('FLOW_INVALID_TITLE: title is required')
    if (repoRoot.length === 0) throw new Error('REPOSITORY_INVALID: repoRoot is required')
    const preflight = await this.git.preflight(repoRoot, this.config.worktreeRootName)
    const workspace = request.workspaceId === undefined
      ? this.workspaceRegistry.list().find(candidate => candidate.path === preflight.root)
      : this.workspaceRegistry.get(WorkspaceId(request.workspaceId))
    if (workspace === undefined || workspace.path !== preflight.root) throw new Error(`FLOW_WORKSPACE_REQUIRED: add ${preflight.root} as a DSH Workspace before creating a Flow`)
    const flowId = FlowId(`flow-${randomUUID()}`)
    try {
      const root = await this.ensureRootAgent(flowId, preflight.root)
      const skillSnapshot = await this.snapshotSkills(preflight.root, root)
      const flow = {
        ...createFlowRecord({
          id: flowId,
          title,
          repoRoot: preflight.root,
          rootSessionId: root.id,
          workspaceId: workspace?.id,
          now: Date.now(),
        }),
        skillSnapshot,
      }
      return await this.repository.create(flow)
    } catch (error) {
      const handle = this.flowHandles.get(flowId)
      if (handle !== undefined) {
        this.flowHandles.delete(flowId)
        await handle.dispose()
      }
      throw error
    }
  }

  /** Advance the visible phase for the initial vertical slice. */
  @Remote('advance')
  async advance(request: AdvanceFlowRequest): Promise<FlowRecord> {
    const action = flowActionSchema.parse(request.action) as FlowAction
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (action === 'pause' && current.lanes.some(lane => ['running', 'integrating'].includes(lane.status))) throw new Error('PAUSE_GATE_BLOCKED: wait for active Lane mutations to quiesce')
    const root = await this.rootForFlow(current)
    const transition = transitionFor(current, action)
    if (transition === undefined) throw new Error(`FLOW_INVALID_TRANSITION: ${current.phase} cannot accept action ${action}`)
    const gate = evaluateTransitionGate(current, action)
    if (gate.kind !== 'pass') throw new Error(`FLOW_GATE_BLOCKED: ${gate.kind === 'blocked' ? gate.code : gate.gate}: ${gate.message}`)
    const skillName = action === 'start-bug' ? 'diagnosing-bugs' : action === 'start-large-effort' ? 'wayfinder' : current.phase === 'intake' && transition.to === 'grilling' ? 'grill-with-docs' : undefined
    const skill = skillName === undefined ? undefined : await this.loadSkill(skillName, current.repoRoot, root)
    const next = await this.repository.update(flowId, request.expectedRevision, currentRecord => {
      if (currentRecord.phase === 'accepted' || currentRecord.phase === 'aborted') throw new Error(`FLOW_TERMINAL: ${currentRecord.phase}`)
      const currentTransition = transitionFor(currentRecord, action)
      if (currentTransition === undefined) throw new Error(`FLOW_INVALID_TRANSITION: ${currentRecord.phase} cannot accept action ${action}`)
      const now = Date.now()
      const planningReturnPhase = action === 'start-research' || action === 'start-prototype'
        ? currentRecord.phase === 'wayfinding' ? 'wayfinding' : currentRecord.phase === 'intake' ? 'intake' : 'grilling'
        : currentRecord.planningReturnPhase
      const next = {
        ...currentRecord,
        revision: currentRecord.revision + 1,
        phase: currentTransition.to,
        ...(planningReturnPhase === undefined ? {} : { planningReturnPhase }),
        nextAction: nextActionFor(currentTransition.to),
        updatedAt: now,
      }
      if (action === 'pause') return { ...next, pausedFrom: currentRecord.phase }
      if (action === 'resume') {
        const { pausedFrom: _pausedFrom, ...withoutPausedFrom } = next
        return withoutPausedFrom
      }
      return next
    })
    if (skill !== undefined && root !== undefined) await this.startPlanning(root, skill, next)
    return next
  }

  /** Append a decision and supersede the previous answer to the same question. */
  @Remote('decide')
  async decide(request: RecordDecisionRequest): Promise<FlowRecord> {
    const question = request.question.trim()
    const answer = request.answer.trim()
    if (question.length === 0 || answer.length === 0) throw new Error('DECISION_INVALID: question and answer are required')
    const decisionId = `decision-${randomUUID()}`
    const artifact = await this.artifactStore.put({
      kind: 'decision', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({ question, answer }), 'utf8'),
    })
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      const now = Date.now()
      const decisions = current.decisions.map(decision => decision.question === question && decision.status === 'active'
        ? { ...decision, status: 'superseded' as const, supersededBy: decisionId }
        : decision)
      return {
        ...current,
        revision: current.revision + 1,
        decisions: [...decisions, { id: decisionId, question, answer, status: 'active' as const, createdAt: now }],
        artifacts: [...current.artifacts, artifact],
        updatedAt: now,
      }
    })
  }

  /** Add one Ticket to the durable graph, rejecting unknown or duplicate dependencies. */
  @Remote('ticket')
  async ticket(request: CreateTicketRequest): Promise<FlowRecord> {
    const title = request.title.trim()
    if (title.length === 0) throw new Error('TICKET_INVALID: title is required')
    const dependsOn = [...new Set(request.dependsOn ?? [])]
    const acceptanceCriteria = [...new Set((request.acceptanceCriteria ?? []).map(item => item.trim()).filter(Boolean))]
    const workflowRole = request.workflowRole?.trim() || undefined
    const artifact = await this.artifactStore.put({
      kind: 'ticket', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({ title, dependsOn, acceptanceCriteria, workflowRole }), 'utf8'),
    })
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      const known = new Set(current.tickets.map(ticket => ticket.id))
      const id = `ticket-${randomUUID()}`
      const nextTicket = { id, title, status: dependsOn.length > 0 ? 'blocked' as const : 'open' as const, blockedBy: dependsOn, dependsOn, ...(acceptanceCriteria.length === 0 ? {} : { acceptanceCriteria }), ...(workflowRole === undefined ? {} : { workflowRole }) }
      validateTicketGraph([...current.tickets, nextTicket])
      return {
        ...current,
        revision: current.revision + 1,
        tickets: [...current.tickets, nextTicket],
        artifacts: [...current.artifacts, artifact],
        updatedAt: Date.now(),
      }
    })
  }

  /** Edit one unpublished Ticket while preserving the graph's acyclic dependency contract. */
  @Remote('updateTicket')
  async updateTicket(request: UpdateTicketRequest): Promise<FlowRecord> {
    const title = request.title.trim()
    if (title.length === 0) throw new Error('TICKET_INVALID: title is required')
    const dependsOn = [...new Set(request.dependsOn ?? [])]
    const acceptanceCriteria = [...new Set((request.acceptanceCriteria ?? []).map(item => item.trim()).filter(Boolean))]
    const workflowRole = request.workflowRole?.trim() || undefined
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      const ticket = current.tickets.find(item => item.id === request.ticketId)
      if (ticket === undefined) throw new Error(`TICKET_NOT_FOUND: ${request.ticketId}`)
      if (current.lanes.some(lane => lane.ticketId === ticket.id && ['preparing', 'ready', 'running', 'blocked', 'completed', 'integrating', 'integrated'].includes(lane.status))) throw new Error('TICKET_EDIT_BLOCKED: execution has already started for this Ticket')
      const updated = { ...ticket, title, dependsOn, blockedBy: dependsOn, status: dependsOn.length > 0 ? 'blocked' as const : 'open' as const, ...(acceptanceCriteria.length === 0 ? {} : { acceptanceCriteria }), ...(workflowRole === undefined ? {} : { workflowRole }) }
      const tickets = current.tickets.map(item => item.id === ticket.id ? updated : item)
      validateTicketGraph(tickets)
      const { tracker: _tracker, review: _review, ...withoutPublishedEvidence } = current
      const staleSpec = current.spec?.status === 'approved' ? { ...current.spec, status: 'stale' as const } : current.spec
      return { ...withoutPublishedEvidence, revision: current.revision + 1, tickets, ...(staleSpec === undefined ? {} : { spec: staleSpec }), updatedAt: Date.now() }
    })
  }

  /** Start a bounded Research, Prototype, or Wayfinder activity from an explicit planning phase. */
  @Remote('startActivity')
  async startActivity(request: StartActivityRequest): Promise<FlowRecord> {
    const question = request.question.trim()
    if (question.length === 0) throw new Error('ACTIVITY_INVALID: question is required')
    const targetPhase = request.kind === 'research' ? 'researching' : request.kind === 'prototype' ? 'prototyping' : 'wayfinding'
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      if (!['intake', 'grilling', 'wayfinding', 'researching', 'prototyping'].includes(current.phase)) throw new Error(`ACTIVITY_PHASE_INVALID: ${current.phase} cannot start ${request.kind}`)
      if ((current.activities ?? []).some(activity => activity.status === 'open')) throw new Error('ACTIVITY_ALREADY_OPEN: complete the current planning activity first')
      const activity = { id: `activity-${randomUUID()}`, kind: request.kind, question, ...(request.expectedEvidence?.trim() ? { expectedEvidence: request.expectedEvidence.trim() } : {}), status: 'open' as const, createdAt: Date.now() }
      return { ...current, revision: current.revision + 1, phase: targetPhase, planningReturnPhase: current.phase === 'wayfinding' ? 'wayfinding' : current.phase === 'intake' ? 'intake' : 'grilling', nextAction: request.kind === 'wayfinder' ? 'Resolve the Wayfinder map' : `Complete the ${request.kind} activity`, activities: [...(current.activities ?? []), activity], updatedAt: Date.now() }
    })
  }

  /** Complete a planning activity with an immutable evidence reference and optional Wayfinder handoff. */
  @Remote('completeActivity')
  async completeActivity(request: CompleteActivityRequest): Promise<FlowRecord> {
    const output = request.output.trim()
    const sourceRef = request.sourceRef.trim()
    if (output.length === 0 || sourceRef.length === 0) throw new Error('ACTIVITY_INVALID: output and sourceRef are required')
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      const activity = (current.activities ?? []).find(item => item.id === request.activityId)
      if (activity === undefined || activity.status !== 'open') throw new Error(`ACTIVITY_NOT_FOUND: ${request.activityId}`)
      if (activity.kind === 'wayfinder' && request.handoff === undefined) throw new Error('WAYFINDER_HANDOFF_REQUIRED: choose to-grilling, to-spec, or to-tickets')
      const handoff = request.handoff
      const nextPhase = activity.kind === 'wayfinder'
        ? handoff === 'to-spec' ? 'spec-review' : handoff === 'to-tickets' ? 'ticketing' : 'grilling'
        : current.planningReturnPhase ?? 'grilling'
      const completed = { ...activity, status: 'completed' as const, output, sourceRef, ...(handoff === undefined ? {} : { handoff }), completedAt: Date.now() }
      return { ...current, revision: current.revision + 1, phase: nextPhase, nextAction: nextActionFor(nextPhase), activities: (current.activities ?? []).map(item => item.id === activity.id ? completed : item), updatedAt: Date.now() }
    })
  }

  /** Reserve an isolated Lane path for one Ticket without running Git commands yet. */
  @Remote('lane')
  async lane(request: PrepareLaneRequest): Promise<FlowRecord> {
    return await this.repository.update(FlowId(request.flowId), request.expectedRevision, current => {
      const ticket = current.tickets.find(item => item.id === request.ticketId)
      if (ticket === undefined) throw new Error(`TICKET_NOT_FOUND: ${request.ticketId}`)
      if (current.lanes.some(lane => lane.ticketId === request.ticketId && !['failed', 'cancelled'].includes(lane.status))) {
        throw new Error(`LANE_EXISTS: ${request.ticketId}`)
      }
      const laneId = `lane-${randomUUID()}`
      const slug = ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ticket'
      const branch = `matt-flow/lane/${slug}-${laneId.slice(-8)}`
      const worktreePath = join(current.repoRoot, this.config.worktreeRootName, current.id, laneId)
      return {
        ...current,
        revision: current.revision + 1,
        lanes: [...current.lanes, { id: laneId, ticketId: ticket.id, status: 'preparing' as const, branch, worktreePath, updatedAt: Date.now() }],
        updatedAt: Date.now(),
      }
    })
  }

  private async ensureIntegration(flow: FlowRecord, expectedRevision: number): Promise<FlowRecord> {
    if (flow.integration !== undefined) return flow
    const existing = this.integrationPromises.get(flow.id)
    if (existing !== undefined) return await existing
    const pending = (async () => {
      const preflight = await this.git.preflight(flow.repoRoot, this.config.worktreeRootName)
      const slug = flow.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'flow'
      const branch = `matt-flow/integration/${slug}-${flow.id.slice(-8)}`
      const worktreePath = join(flow.repoRoot, this.config.worktreeRootName, flow.id, 'integration')
      await this.git.createWorktree(flow.repoRoot, branch, worktreePath, preflight.head)
      try {
        return await this.repository.update(flow.id, expectedRevision, current => ({
          ...current,
          revision: current.revision + 1,
          integration: { branch, worktreePath, baseCommit: preflight.head, headCommit: preflight.head },
          updatedAt: Date.now(),
        }))
      } catch (error) {
        await this.git.removeCleanWorktree(flow.repoRoot, worktreePath).catch(() => {})
        throw error
      }
    })()
    this.integrationPromises.set(flow.id, pending)
    try {
      return await pending
    } finally {
      this.integrationPromises.delete(flow.id)
    }
  }

  /** Run repository preflight and create one reserved Lane worktree. */
  @Remote('provisionLane')
  async provisionLane(request: ProvisionLaneRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const prepared = await this.ensureIntegration(current, request.expectedRevision)
    const lane = prepared.lanes.find(item => item.id === request.laneId)
    if (lane === undefined) throw new Error(`LANE_NOT_FOUND: ${request.laneId}`)
    if (lane.status !== 'preparing' || lane.branch === undefined || lane.worktreePath === undefined) {
      throw new Error(`LANE_INVALID_STATE: ${request.laneId}`)
    }
    const integration = prepared.integration
    if (integration === undefined) throw new Error(`INTEGRATION_REQUIRED: ${prepared.id}`)
    if ((await this.git.status(integration.worktreePath)).length > 0) throw new Error('INTEGRATION_DIRTY: integration worktree must be clean')
    await this.git.createWorktree(prepared.repoRoot, lane.branch, lane.worktreePath, integration.headCommit)
    const ticket = prepared.tickets.find(item => item.id === lane.ticketId)
    if (ticket === undefined) throw new Error(`TICKET_NOT_FOUND: ${lane.ticketId}`)
    const packet = await this.artifactStore.put({
      kind: 'packet', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        schema: 'dsh-matt-skills-flow/task-packet/v1',
        flowId: current.id,
        laneId: lane.id,
        ticket,
        baseCommit: integration.headCommit,
        integrationBranch: integration.branch,
        worktreePath: lane.worktreePath,
        skillSnapshotSha256: prepared.skillSnapshot?.aggregateSha256,
        requiredChecks: ['pnpm typecheck', 'pnpm test'],
      }), 'utf8'),
    })
    return await this.repository.update(flowId, prepared.revision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(item => item.id === lane.id ? { ...item, status: 'ready' as const, baseCommit: integration.headCommit, packetArtifactId: packet.id, packetSha256: packet.sha256, updatedAt: Date.now() } : item),
      artifacts: [...record.artifacts, packet],
      updatedAt: Date.now(),
    }))
  }

  /** Merge one completed Lane into the Flow integration worktree after a human Gate. */
  @Remote('integrate')
  async integrate(request: IntegrateLaneRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const integration = current.integration
    const lane = current.lanes.find(item => item.id === request.laneId)
    if (integration === undefined) throw new Error(`INTEGRATION_REQUIRED: ${request.flowId}`)
    if (lane === undefined || lane.status !== 'completed' || lane.branch === undefined || lane.worktreePath === undefined || lane.baseCommit === undefined) throw new Error(`INTEGRATION_GATE_BLOCKED: Lane ${request.laneId} is not a completed Lane with a worktree`)
    const laneStatus = await this.git.status(lane.worktreePath)
    if (laneStatus.length > 0) throw new Error('INTEGRATION_DIRTY: Lane worktree contains uncommitted changes')
    const laneCommit = lane.commit ?? await this.git.head(lane.worktreePath)
    if (!(await this.git.isAncestor(lane.worktreePath, lane.baseCommit, laneCommit))) throw new Error('INTEGRATION_COMMIT_INVALID: Lane commit is not based on its recorded base')
    await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(item => item.id === lane.id ? { ...item, status: 'integrating' as const, commit: laneCommit, updatedAt: Date.now() } : item),
      updatedAt: Date.now(),
    }))
    try {
      const headCommit = await this.git.mergeNoEdit(integration.worktreePath, lane.branch)
      return await this.repository.update(flowId, request.expectedRevision + 1, record => ({
        ...record,
        revision: record.revision + 1,
        integration: record.integration === undefined ? undefined : { ...record.integration, headCommit },
        lanes: record.lanes.map(item => item.id === lane.id ? { ...item, status: 'integrated' as const, commit: laneCommit, updatedAt: Date.now() } : item),
        tickets: record.tickets.map(ticket => ticket.id === lane.ticketId ? { ...ticket, status: 'integrated' as const } : ticket),
        updatedAt: Date.now(),
      }))
    } catch (error) {
      const latest = this.repository.get(flowId)
      if (latest !== undefined) await this.repository.update(flowId, latest.revision, record => ({ ...record, recovery: { status: 'required' as const, reason: error instanceof Error ? error.message : String(error), observedAt: Date.now() }, updatedAt: Date.now(), revision: record.revision + 1 })).catch(() => {})
      throw error
    }
  }

  /** Persist a root answer as a Decision and re-arm the blocked Lane with a new packet digest. */
  @Remote('answerQuestion')
  async answerQuestion(request: AnswerQuestionRequest): Promise<FlowRecord> {
    const answer = request.answer.trim()
    if (answer.length === 0) throw new Error('QUESTION_ANSWER_INVALID: answer is required')
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const question = current.questions.find(item => item.id === request.questionId)
    if (question === undefined || question.status !== 'pending') throw new Error(`QUESTION_NOT_FOUND: ${request.questionId}`)
    const decisionId = `decision-${randomUUID()}`
    const decisionArtifact = await this.artifactStore.put({ kind: 'decision', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify({ question: question.question, answer, sourceQuestionId: question.id }), 'utf8') })
    const lane = question.ticketId === undefined ? undefined : current.lanes.find(item => item.ticketId === question.ticketId && item.status === 'blocked')
    const packet = lane === undefined ? undefined : await this.artifactStore.put({
      kind: 'packet', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({ schema: 'dsh-matt-skills-flow/task-packet/v1', flowId: current.id, laneId: lane.id, ticket: current.tickets.find(item => item.id === lane.ticketId), baseCommit: current.integration?.headCommit ?? lane.baseCommit, integrationBranch: current.integration?.branch, worktreePath: lane.worktreePath, skillSnapshotSha256: current.skillSnapshot?.aggregateSha256, questionAnswer: { questionId: question.id, answer }, requiredChecks: ['pnpm typecheck', 'pnpm test'] }), 'utf8'),
    })
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      phase: lane === undefined ? record.phase : 'running',
      nextAction: nextActionFor(lane === undefined ? record.phase : 'running'),
      decisions: [...record.decisions, { id: decisionId, question: question.question, answer, status: 'active' as const, createdAt: Date.now() }],
      questions: record.questions.map(item => item.id === question.id ? { ...item, status: 'answered' as const, answer } : item),
      lanes: lane === undefined || packet === undefined ? record.lanes : record.lanes.map(item => item.id === lane.id ? { ...item, status: 'ready' as const, packetArtifactId: packet.id, packetSha256: packet.sha256, resultSummary: `Question answered; retry with packet ${packet.sha256}`, updatedAt: Date.now() } : item),
      artifacts: [...record.artifacts, decisionArtifact, ...(packet === undefined ? [] : [packet])],
      updatedAt: Date.now(),
    }))
  }

  /** Dispatch one structured Lane Agent run from an immutable Task Packet. */
  @Remote('runLane')
  async runLane(request: RunLaneRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const lane = current.lanes.find(item => item.id === request.laneId)
    if (lane === undefined || lane.status !== 'ready' || lane.packetArtifactId === undefined || lane.packetSha256 === undefined) {
      throw new Error(`LANE_NOT_READY: ${request.laneId}`)
    }
    const activeLanes = current.lanes.filter(item => item.status === 'running').length
    if (activeLanes >= this.config.defaultMaxConcurrentLanes) throw new Error(`LANE_CONCURRENCY_LIMIT: ${this.config.defaultMaxConcurrentLanes}`)
    const root = await this.rootForFlow(current)
    if (root === undefined) throw new Error('ROOT_AGENT_UNAVAILABLE: Lane Agent needs a live root Agent')
    const packetRecord = current.artifacts.find(artifact => artifact.id === lane.packetArtifactId)
    if (packetRecord === undefined) throw new Error(`PACKET_NOT_FOUND: ${lane.packetArtifactId}`)
    const packet = (await this.artifactStore.read(packetRecord)).toString('utf8')
    const running = await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(item => item.id === lane.id ? { ...item, status: 'running' as const, updatedAt: Date.now() } : item),
      updatedAt: Date.now(),
    }))
    void this.driveLane(flowId, lane, running, root, packet)
    return running
  }

  private async driveLane(flowId: FlowId, lane: FlowRecord['lanes'][number], running: FlowRecord, root: Agent, packet: string): Promise<void> {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      void this.finishLane(flowId, lane.id, 'failed', 'LANE_TIMEOUT')
      controller.abort(new Error('LANE_TIMEOUT'))
    }, this.config.laneTimeoutMs)
    let run: Awaited<ReturnType<typeof this.ctx.subagents.start>> | undefined
    try {
      run = await this.ctx.subagents.start(this.config.laneSubagentProvider, {
        label: 'Matt Flow Lane ' + lane.id,
        parent: root,
        signal: controller.signal,
        agentOptions: { maxTokens: this.config.laneMaxTokens },
        maxDepth: this.config.laneMaxDepth,
        persona: 'You are a one-shot implementation Lane Agent. Return only the requested structured result.',
        outputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['completed', 'blocked', 'failed'] }, summary: { type: 'string' }, changedFiles: { type: 'array', items: { type: 'string' } }, commit: { type: 'string' }, question: { type: 'string' }, questionContext: { type: 'string' }, questionOptions: { type: 'array', items: { type: 'string' } }, questionSourceRefs: { type: 'array', items: { type: 'string' } } }, required: ['status', 'summary', 'changedFiles'], additionalProperties: false },
        prompt: [{ type: 'text', text: 'Implement the Ticket in the supplied Task Packet inside the exact worktree. Do not change the integration checkout. Run the required checks and commit completed work on the Lane branch. Return JSON with status, summary, changedFiles, and commit when completed. Task Packet:\n' + packet }],
      })
      const result = await run.result
      if (timedOut) return
      if (result.stopReason !== 'completed') throw new Error('LANE_RESULT_INVALID: stopReason=' + result.stopReason)
      const parsed = parseLaneResult(result.structured)
      const actualCommit = parsed.status === 'completed' ? await this.git.head(lane.worktreePath ?? '') : undefined
      if (parsed.status === 'completed' && (actualCommit === undefined || lane.baseCommit === undefined || !(await this.git.isAncestor(lane.worktreePath ?? '', lane.baseCommit, actualCommit)))) throw new Error('LANE_COMMIT_INVALID: completed Lane worktree must contain a commit based on its Task Packet base')
      if (parsed.status === 'completed' && parsed.commit !== undefined && actualCommit !== undefined && !actualCommit.startsWith(parsed.commit) && !parsed.commit.startsWith(actualCommit)) throw new Error(`LANE_COMMIT_MISMATCH: Agent reported ${parsed.commit}, but the Lane worktree is at ${actualCommit}`)
      const commit = actualCommit
      const resultWithCommit = commit === undefined ? parsed : { ...parsed, commit }
      const receipt = await this.artifactStore.put({ kind: 'lane', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify({ schema: 'dsh-matt-skills-flow/lane-receipt/v1', laneId: lane.id, packetSha256: lane.packetSha256, result: resultWithCommit }), 'utf8') })
      const summary = parsed.status === 'completed' && commit !== undefined && lane.baseCommit !== undefined
        ? `Host verified Lane worktree HEAD ${commit} is based on ${lane.baseCommit}; the Agent report is retained in the Lane Receipt.`
        : parsed.summary
      await this.finishLane(flowId, lane.id, parsed.status, summary, receipt, parsed.question, commit, { context: parsed.questionContext, options: parsed.questionOptions, sourceRefs: parsed.questionSourceRefs, changedFiles: parsed.changedFiles })
    } catch (error) {
      await this.finishLane(flowId, lane.id, 'failed', error instanceof Error ? error.message : String(error))
    } finally {
      clearTimeout(timer)
      controller.abort()
      await run?.dispose()
    }
  }

  private async finishLane(flowId: FlowId, laneId: string, status: 'completed' | 'blocked' | 'failed', summary: string, receipt?: import('./artifacts.ts').ArtifactRecord, question?: string, commit?: string, questionDetails?: { context?: string; options?: string[]; sourceRefs?: string[]; changedFiles?: string[] }): Promise<void> {
    const current = this.repository.get(flowId)
    if (current === undefined) return
    await this.repository.update(flowId, current.revision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(item => item.id === laneId ? { ...item, status, ...(commit === undefined ? {} : { commit }), ...(questionDetails?.changedFiles === undefined ? {} : { changedFiles: questionDetails.changedFiles }), ...(receipt === undefined ? {} : { resultArtifactId: receipt.id, resultSha256: receipt.sha256 }), resultSummary: summary, updatedAt: Date.now() } : item),
      tickets: status === 'completed'
        ? record.tickets.map(ticket => record.lanes.find(item => item.id === laneId)?.ticketId === ticket.id ? { ...ticket, status: 'completed' as const } : ticket)
        : status === 'failed'
          ? record.tickets.map(ticket => record.lanes.find(item => item.id === laneId)?.ticketId === ticket.id ? { ...ticket, status: 'failed' as const } : ticket)
          : record.tickets,
      questions: status === 'blocked' && question !== undefined
        ? [...record.questions, { id: 'question-' + randomUUID(), ticketId: record.lanes.find(item => item.id === laneId)?.ticketId, question, ...(questionDetails?.context === undefined ? {} : { context: questionDetails.context }), ...(questionDetails?.options === undefined ? {} : { options: questionDetails.options }), ...(questionDetails?.sourceRefs === undefined ? {} : { sourceRefs: questionDetails.sourceRefs }), status: 'pending' as const, createdAt: Date.now() }]
        : record.questions,
      artifacts: receipt === undefined ? record.artifacts : [...record.artifacts, receipt],
      updatedAt: Date.now(),
    })).catch(() => {})
  }

  /** Freeze completed Lane evidence into a candidate and arm the human acceptance Gate. */
  @Remote('prepareAcceptance')
  async prepareAcceptance(request: PrepareAcceptanceRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const completed = current.lanes.filter(lane => lane.status === 'integrated')
    if (completed.length === 0) throw new Error('REVIEW_ADMISSION_FAILED: no integrated Lane Receipt is available')
    if (current.tracker === undefined) throw new Error('REVIEW_ADMISSION_FAILED: publish the Ticket Graph before review admission')
    const trackerSnapshot = await this.tracker.inspect(current, current.tracker as unknown as TrackerRecord)
    if (trackerSnapshot.drift.length > 0) throw new Error(`TRACKER_DRIFT: ${trackerSnapshot.drift.join(', ')}`)
    const candidateRoot = current.integration?.worktreePath ?? current.repoRoot
    const candidateCommit = current.integration === undefined
      ? (await this.git.preflight(current.repoRoot, this.config.worktreeRootName)).head
      : await this.git.head(candidateRoot)
    const baseCommit = current.integration?.baseCommit ?? candidateCommit
    const changedFiles = await this.git.changedFiles(candidateRoot, baseCommit, candidateCommit)
    const fixedPoint = createHash('sha256').update(JSON.stringify({ candidateCommit, laneResults: completed.map(lane => lane.resultSha256 ?? '') })).digest('hex')
    const acceptanceTrace = buildAcceptanceTrace(current, completed)
    if (acceptanceTrace.length === 0 || acceptanceTrace.some(trace => trace.status !== 'covered')) throw new Error('REVIEW_ADMISSION_FAILED: every acceptance criterion needs a completed Lane Receipt and observable signal')
    const candidate = await this.artifactStore.put({
      kind: 'review', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        schema: 'dsh-matt-skills-flow/review-candidate/v1', flowId: current.id, fixedPoint, candidateCommit, baseCommit, changedFiles,
        integrationCommit: current.integration?.headCommit ?? candidateCommit,
        integrationBranch: current.integration?.branch,
        integrationWorktreePath: current.integration?.worktreePath,
        laneCommits: completed.map(lane => ({ laneId: lane.id, ticketId: lane.ticketId, commit: lane.commit, baseCommit: lane.baseCommit })),
        specSha256: current.spec?.sha256, graphSha256: current.tracker?.graphSha256,
        decisionLedgerSha256: current.artifacts.find(artifact => artifact.kind === 'decision')?.sha256,
        acceptanceTrace, tickets: current.tickets, decisions: current.decisions, lanes: completed,
      }), 'utf8'),
    })
    const admission = await this.artifactStore.put({
      kind: 'review', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        schema: 'dsh-matt-skills-flow/review-admission/v1', flowId: current.id, candidateArtifactId: candidate.id, candidateSha256: candidate.sha256,
        candidateCommit, specSha256: current.spec?.sha256, graphSha256: current.tracker?.graphSha256,
        decisionLedgerSha256: current.artifacts.find(artifact => artifact.kind === 'decision')?.sha256,
        changedFiles, acceptanceTrace,
        checks: completed.map(lane => ({ laneId: lane.id, receiptArtifactId: lane.resultArtifactId, resultSha256: lane.resultSha256 })),
        knownDeferred: [],
      }), 'utf8'),
    })
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      phase: 'ready-for-acceptance',
      nextAction: nextActionFor('ready-for-acceptance'),
      review: { candidateArtifactId: candidate.id, candidateSha256: candidate.sha256, admissionArtifactId: admission.id, admissionSha256: admission.sha256, fixedPoint, createdAt: Date.now(), status: 'frozen' as const, round: 0, findings: [] },
      acceptance: { status: 'ready' as const, candidateCommit },
      artifacts: [...record.artifacts, candidate, admission],
      updatedAt: Date.now(),
    }))
  }

  /** Commit a human acceptance decision against the frozen candidate and exact Git commit. */
  @Remote('accept')
  async accept(request: AcceptFlowRequest): Promise<FlowRecord> {
    if (request.accept !== true) throw new Error('ACCEPTANCE_CONFIRMATION_REQUIRED: accept must be true')
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (current.review?.status !== 'complete' || current.review.admissionArtifactId === undefined || current.review.admissionSha256 === undefined) throw new Error('ACCEPTANCE_GATE_BLOCKED: review admission is not complete')
    if (current.review.candidateArtifactId !== request.candidateArtifactId) throw new Error('ACCEPTANCE_CANDIDATE_MISMATCH: candidate artifact is not the frozen review target')
    if (current.acceptance?.status !== 'ready' || current.acceptance.candidateCommit === undefined) throw new Error('ACCEPTANCE_GATE_BLOCKED: candidate is not ready for human acceptance')
    if ((current.review.findings ?? []).some(finding => finding.severity !== 'note' && finding.disposition === undefined)) throw new Error('ACCEPTANCE_GATE_BLOCKED: unresolved review findings remain')
    if (current.questions.some(question => question.status === 'pending')) throw new Error('ACCEPTANCE_GATE_BLOCKED: unresolved Questions remain')
    if (current.tracker === undefined) throw new Error('ACCEPTANCE_GATE_BLOCKED: Ticket Graph publication is missing')
    const trackerSnapshot = await this.tracker.inspect(current, current.tracker as unknown as TrackerRecord)
    if (trackerSnapshot.drift.length > 0) throw new Error(`TRACKER_DRIFT: ${trackerSnapshot.drift.join(', ')}`)
    const candidateRoot = current.integration?.worktreePath ?? current.repoRoot
    const head = current.integration === undefined
      ? (await this.git.preflight(current.repoRoot, this.config.worktreeRootName)).head
      : await this.git.head(candidateRoot)
    if (head !== current.acceptance.candidateCommit) throw new Error(`ACCEPTANCE_STALE_CANDIDATE: expected ${current.acceptance.candidateCommit}, current ${head}`)
    const receipt = await this.artifactStore.put({
      kind: 'acceptance', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        schema: 'dsh-matt-skills-flow/acceptance/v1', flowId: current.id,
        candidateId: request.candidateArtifactId, candidateCommit: head,
        acceptedAt: Date.now(), acceptedBy: 'local-user', specSha256: current.spec?.sha256,
        decisionLedgerSha256: current.artifacts.find(artifact => artifact.kind === 'decision')?.sha256,
        graphSha256: current.tracker?.graphSha256, reviewReceiptIds: current.artifacts.filter(artifact => artifact.kind === 'review').map(artifact => artifact.id),
      }), 'utf8'),
    })
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      phase: 'accepted',
      nextAction: nextActionFor('accepted'),
      acceptance: { status: 'accepted' as const, candidateCommit: head, receiptArtifactId: receipt.id, acceptedAt: Date.now(), acceptedBy: 'local-user' as const },
      artifacts: [...record.artifacts, receipt],
      updatedAt: Date.now(),
    }))
  }

  /** Record a human rejection and return the Flow to a selected earlier phase. */
  @Remote('rejectAcceptance')
  async rejectAcceptance(request: RejectAcceptanceRequest): Promise<FlowRecord> {
    const reason = request.reason.trim()
    if (reason.length === 0) throw new Error('REJECTION_REASON_REQUIRED: explain why the candidate is rejected')
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (current.review?.candidateArtifactId !== request.candidateArtifactId || current.acceptance?.status !== 'ready') throw new Error('REJECTION_CANDIDATE_MISMATCH: candidate is not ready for rejection')
    const receipt = await this.artifactStore.put({ kind: 'acceptance', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify({ schema: 'dsh-matt-skills-flow/rejection/v1', flowId: current.id, candidateId: request.candidateArtifactId, reason, returnTo: request.returnTo, rejectedAt: Date.now(), rejectedBy: 'local-user' }), 'utf8') })
    return await this.repository.update(flowId, request.expectedRevision, record => {
      const { review: _review, ...withoutReview } = record
      return { ...withoutReview, revision: record.revision + 1, phase: request.returnTo, nextAction: nextActionFor(request.returnTo), acceptance: { status: 'rejected' as const, candidateCommit: record.acceptance?.candidateCommit, receiptArtifactId: receipt.id }, artifacts: [...record.artifacts, receipt], updatedAt: Date.now() }
    })
  }

  /** Remove one clean Lane worktree while retaining its immutable Flow evidence. */
  @Remote('cleanup')
  async cleanup(request: CleanupLaneRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const lane = current.lanes.find(item => item.id === request.laneId)
    if (lane === undefined) throw new Error(`LANE_NOT_FOUND: ${request.laneId}`)
    if (lane.worktreePath === undefined) return current
    if (!['completed', 'failed', 'cancelled', 'integrated'].includes(lane.status)) throw new Error(`CLEANUP_GATE_BLOCKED: Lane ${lane.id} is still ${lane.status}`)
    await this.git.removeCleanWorktree(current.repoRoot, lane.worktreePath)
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(item => {
        if (item.id !== lane.id) return item
        const { worktreePath: _worktreePath, ...withoutWorktree } = item
        return { ...withoutWorktree, cleanedAt: Date.now(), updatedAt: Date.now() }
      }),
      updatedAt: Date.now(),
    }))
  }

  /** Explicitly resume a cold root Session and record a reconciled recovery checkpoint. */
  @Remote('resume')
  async resume(request: PrepareAcceptanceRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    await this.rootForFlow(current)
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      recovery: { status: 'reconciled' as const, observedAt: Date.now() },
      updatedAt: Date.now(),
    }))
  }

  /** Run independent Standards and Spec review Agents against the immutable candidate. */
  @Remote('requestReview')
  async requestReview(request: RequestReviewRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const hasBlockingFindings = (current.review?.findings ?? []).some(finding => finding.severity !== 'note')
    if (current.review === undefined || current.review.admissionArtifactId === undefined || current.review.admissionSha256 === undefined || (current.review.status !== undefined && current.review.status !== 'frozen' && current.review.status !== 'failed' && !(current.review.status === 'complete' && hasBlockingFindings))) throw new Error('REVIEW_ADMISSION_FAILED: a passed admission artifact and frozen candidate are required')
    const reviewRound = current.review?.round ?? 0
    if (current.review?.status === 'complete' && hasBlockingFindings && reviewRound >= this.config.defaultMaxReviewRounds) throw new Error(`REVIEW_ROUNDS_EXCEEDED: maximum remediation rounds ${this.config.defaultMaxReviewRounds} reached`)
    const artifact = current.artifacts.find(item => item.id === current.review?.candidateArtifactId)
    if (artifact === undefined) throw new Error('REVIEW_ADMISSION_FAILED: candidate artifact is missing')
    const root = await this.rootForFlow(current)
    if (root === undefined) throw new Error('ROOT_AGENT_UNAVAILABLE: review needs a live root Agent')
    const candidate = (await this.artifactStore.read(artifact)).toString('utf8')
    const running = await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      review: record.review === undefined ? undefined : { ...record.review, status: 'running' as const, round: reviewRound + 1 },
      updatedAt: Date.now(),
    }))
    void this.driveReview(flowId, running, root, candidate)
    return running
  }

  private async driveReview(flowId: FlowId, current: FlowRecord, root: Agent, candidate: string): Promise<void> {
    try {
      const axes: readonly ReviewFinding['axis'][] = ['standards', 'spec']
      const findings = (await Promise.all(axes.map(axis => this.runReviewAxis(root, current, axis, candidate)))).flat()
      const receipt = await this.artifactStore.put({ kind: 'review', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify({ schema: 'dsh-matt-skills-flow/review-receipt/v1', flowId: current.id, candidateSha256: current.review?.candidateSha256, findings }), 'utf8') })
      const hasBlocking = findings.some(finding => finding.severity !== 'note')
      await this.repository.update(flowId, this.repository.get(flowId)?.revision ?? current.revision, record => ({
        ...record,
        revision: record.revision + 1,
        phase: hasBlocking ? 'remediation' : 'ready-for-acceptance',
        nextAction: nextActionFor(hasBlocking ? 'remediation' : 'ready-for-acceptance'),
        review: record.review === undefined ? undefined : { ...record.review, status: 'complete' as const, findings },
        acceptance: record.acceptance === undefined
          ? { status: hasBlocking ? 'not-ready' as const : 'ready' as const }
          : { ...record.acceptance, status: hasBlocking ? 'not-ready' as const : 'ready' as const },
        artifacts: [...record.artifacts, receipt],
        updatedAt: Date.now(),
      }))
    } catch (error) {
      const latest = this.repository.get(flowId)
      if (latest === undefined) return
      const explanation = error instanceof Error ? error.message : String(error)
      const finding: ReviewFinding = { id: 'finding-review-runtime-' + randomUUID().slice(0, 8), axis: 'standards', severity: 'blocking', title: 'Review Agent unavailable', explanation }
      const receipt = await this.artifactStore.put({ kind: 'review', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify({ schema: 'dsh-matt-skills-flow/review-receipt/v1', flowId, findings: [finding] }), 'utf8') }).catch(() => undefined)
      await this.repository.update(flowId, latest.revision, record => ({
        ...record,
        revision: record.revision + 1,
        phase: 'remediation',
        nextAction: nextActionFor('remediation'),
        review: record.review === undefined ? undefined : { ...record.review, status: 'complete' as const, findings: [finding] },
        acceptance: record.acceptance === undefined
          ? { status: 'not-ready' as const }
          : { ...record.acceptance, status: 'not-ready' as const },
        artifacts: receipt === undefined ? record.artifacts : [...record.artifacts, receipt],
        recovery: { status: 'required' as const, reason: explanation, observedAt: Date.now() },
        updatedAt: Date.now(),
      })).catch(() => {})
    }
  }

  /** Record a human disposition for one Review finding and reopen acceptance when all are settled. */
  @Remote('disposeFinding')
  async disposeFinding(request: DisposeFindingRequest): Promise<FlowRecord> {
    const reason = request.reason.trim()
    if (reason.length === 0) throw new Error('REVIEW_DISPOSITION_INVALID: reason is required')
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (current.review?.status !== 'complete') throw new Error('REVIEW_DISPOSITION_INVALID: review is not complete')
    if (!(current.review.findings ?? []).some(finding => finding.id === request.findingId)) throw new Error(`FINDING_NOT_FOUND: ${request.findingId}`)
    if (request.kind === 'fixed') {
      const refreshed = await this.reFreezeCandidate(current)
      return await this.repository.update(flowId, request.expectedRevision, record => ({
        ...record,
        revision: record.revision + 1,
        phase: 'remediation',
        nextAction: nextActionFor('remediation'),
        review: {
          candidateArtifactId: refreshed.candidate.id,
          candidateSha256: refreshed.candidate.sha256,
          admissionArtifactId: refreshed.admission.id,
          admissionSha256: refreshed.admission.sha256,
          fixedPoint: refreshed.fixedPoint,
          createdAt: Date.now(),
          status: 'frozen' as const,
          round: (record.review?.round ?? 0) + 1,
          findings: [],
        },
        acceptance: { status: 'not-ready' as const, candidateCommit: refreshed.candidateCommit },
        artifacts: [...record.artifacts, refreshed.candidate, refreshed.admission],
        updatedAt: Date.now(),
      }))
    }
    return await this.repository.update(flowId, request.expectedRevision, record => {
      const findings = (record.review?.findings ?? []).map(finding => finding.id === request.findingId ? { ...finding, disposition: { kind: request.kind, reason } } : finding)
      const unresolved = findings.some(finding => finding.severity !== 'note' && (finding.disposition === undefined || finding.disposition.kind === 'deferred'))
      return {
        ...record,
        revision: record.revision + 1,
        phase: unresolved ? 'remediation' : 'ready-for-acceptance',
        nextAction: nextActionFor(unresolved ? 'remediation' : 'ready-for-acceptance'),
        review: record.review === undefined ? undefined : { ...record.review, findings },
        acceptance: record.acceptance === undefined
          ? { status: unresolved ? 'not-ready' as const : 'ready' as const }
          : { ...record.acceptance, status: unresolved ? 'not-ready' as const : 'ready' as const },
        updatedAt: Date.now(),
      }
    })
  }

  private async reFreezeCandidate(current: FlowRecord): Promise<{ candidate: ArtifactRecord; admission: ArtifactRecord; candidateCommit: string; fixedPoint: string }> {
    if (current.review?.candidateArtifactId === undefined || current.review.admissionArtifactId === undefined) throw new Error('REMEDIATION_ADMISSION_REQUIRED: the current candidate has no admission artifact')
    if (current.tracker === undefined) throw new Error('REMEDIATION_ADMISSION_REQUIRED: Ticket Graph publication is missing')
    const trackerSnapshot = await this.tracker.inspect(current, current.tracker as unknown as TrackerRecord)
    if (trackerSnapshot.drift.length > 0) throw new Error(`TRACKER_DRIFT: ${trackerSnapshot.drift.join(', ')}`)
    const candidateRoot = current.integration?.worktreePath ?? current.repoRoot
    const candidateCommit = current.integration === undefined
      ? (await this.git.preflight(current.repoRoot, this.config.worktreeRootName)).head
      : await this.git.head(candidateRoot)
    if (candidateCommit === current.acceptance?.candidateCommit) throw new Error('REMEDIATION_CANDIDATE_UNCHANGED: fixed finding requires a new integration commit')
    const baseCommit = current.integration?.baseCommit ?? candidateCommit
    const changedFiles = await this.git.changedFiles(candidateRoot, baseCommit, candidateCommit)
    const completed = current.lanes.filter(lane => lane.status === 'integrated')
    const acceptanceTrace = buildAcceptanceTrace(current, completed)
    if (acceptanceTrace.length === 0 || acceptanceTrace.some(trace => trace.status !== 'covered')) throw new Error('REMEDIATION_ADMISSION_FAILED: acceptance trace is incomplete')
    const fixedPoint = createHash('sha256').update(JSON.stringify({ candidateCommit, laneResults: completed.map(lane => lane.resultSha256 ?? '') })).digest('hex')
    const previous = current.artifacts.find(artifact => artifact.id === current.review?.candidateArtifactId)
    if (previous === undefined) throw new Error('REMEDIATION_CANDIDATE_MISSING: immutable candidate artifact is unavailable')
    const previousPayload = JSON.parse((await this.artifactStore.read(previous)).toString('utf8')) as Record<string, unknown>
    const candidate = await this.artifactStore.put({
      kind: 'review', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        ...previousPayload,
        schema: 'dsh-matt-skills-flow/review-candidate/v1',
        supersedesCandidateArtifactId: previous.id,
        fixedPoint, candidateCommit, baseCommit, changedFiles,
        integrationCommit: current.integration?.headCommit ?? candidateCommit,
        integrationBranch: current.integration?.branch,
        integrationWorktreePath: current.integration?.worktreePath,
        laneCommits: completed.map(lane => ({ laneId: lane.id, ticketId: lane.ticketId, commit: lane.commit, baseCommit: lane.baseCommit })),
        specSha256: current.spec?.sha256, graphSha256: current.tracker.graphSha256,
        decisionLedgerSha256: current.artifacts.find(artifact => artifact.kind === 'decision')?.sha256,
        acceptanceTrace, tickets: current.tickets, decisions: current.decisions, lanes: completed,
      }), 'utf8'),
    })
    const admission = await this.artifactStore.put({
      kind: 'review', mediaType: 'application/json',
      bytes: Buffer.from(JSON.stringify({
        schema: 'dsh-matt-skills-flow/review-admission/v1', flowId: current.id,
        supersedesAdmissionArtifactId: current.review.admissionArtifactId,
        candidateArtifactId: candidate.id, candidateSha256: candidate.sha256, candidateCommit,
        specSha256: current.spec?.sha256, graphSha256: current.tracker.graphSha256,
        decisionLedgerSha256: current.artifacts.find(artifact => artifact.kind === 'decision')?.sha256,
        changedFiles, acceptanceTrace,
        checks: completed.map(lane => ({ laneId: lane.id, receiptArtifactId: lane.resultArtifactId, resultSha256: lane.resultSha256 })),
        knownDeferred: [],
      }), 'utf8'),
    })
    return { candidate, admission, candidateCommit, fixedPoint }
  }

  /** Compile active Decisions into a bounded, immutable Spec draft. */
  @Remote('generateSpec')
  async generateSpec(request: SpecRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const active = current.decisions.filter(decision => decision.status === 'active')
    if (active.length === 0) throw new Error('SPEC_GATE_BLOCKED: at least one active Decision is required')
    const content = [
      `# ${current.title} Spec`, '',
      '## Confirmed decisions',
      ...active.map(decision => `- ${decision.question}: ${decision.answer}`),
      '', '## Planning evidence',
      ...(current.activities ?? []).filter(activity => activity.status === 'completed').map(activity => `- ${activity.kind}: ${activity.output ?? ''} (${activity.sourceRef ?? 'no reference'})`),
      '', '## Test seams', '- Focused unit tests', '- Assembled Web acceptance',
    ].join('\n') + '\n'
    const artifact = await this.artifactStore.put({ kind: 'spec', mediaType: 'text/markdown', bytes: Buffer.from(content, 'utf8') })
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      phase: 'spec-review',
      nextAction: nextActionFor('spec-review'),
      spec: { status: 'draft' as const, artifactId: artifact.id, sha256: artifact.sha256, createdAt: Date.now() },
      artifacts: [...record.artifacts, artifact],
      updatedAt: Date.now(),
    }))
  }

  /** Approve the current Spec draft and freeze its digest for dependent work. */
  @Remote('approveSpec')
  async approveSpec(request: SpecRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (current.spec?.status !== 'draft') throw new Error('SPEC_GATE_BLOCKED: no draft Spec is awaiting approval')
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      phase: 'spec-ready',
      nextAction: nextActionFor('spec-ready'),
      spec: record.spec === undefined ? undefined : { ...record.spec, status: 'approved' as const, approvedAt: Date.now() },
      updatedAt: Date.now(),
    }))
  }

  /** Export a redacted bounded evidence manifest without Skill bodies or prompts. */
  @Remote('exportEvidence')
  async exportEvidence(request: ExportRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const manifest = {
      schema: 'dsh-matt-skills-flow/evidence-export/v1',
      flowId: current.id,
      title: current.title,
      revision: current.revision,
      phase: current.phase,
      skillSnapshot: current.skillSnapshot === undefined ? undefined : { status: current.skillSnapshot.status, count: current.skillSnapshot.count, names: current.skillSnapshot.names, aggregateSha256: current.skillSnapshot.aggregateSha256 },
      decisions: current.decisions,
      tickets: current.tickets,
      lanes: current.lanes.map(lane => ({ id: lane.id, ticketId: lane.ticketId, status: lane.status, branch: lane.branch, worktreePath: lane.worktreePath, packetSha256: lane.packetSha256, resultSha256: lane.resultSha256 })),
      review: current.review,
      acceptance: current.acceptance,
      artifactRefs: current.artifacts.map(artifact => ({ id: artifact.id, kind: artifact.kind, sha256: artifact.sha256, size: artifact.size })),
    }
    const artifact = await this.artifactStore.put({ kind: 'export', mediaType: 'application/json', bytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8') })
    return await this.repository.update(flowId, current.revision, record => ({ ...record, revision: record.revision + 1, export: { artifactId: artifact.id, sha256: artifact.sha256, createdAt: Date.now() }, artifacts: [...record.artifacts, artifact], updatedAt: Date.now() }))
  }

  private async runReviewAxis(root: Agent, flow: FlowRecord, axis: ReviewFinding['axis'], candidate: string): Promise<ReviewFinding[]> {
    const controller = new AbortController()
    let rejectTimeout: (error: Error) => void = () => {}
    const timeout = new Promise<never>((_, reject) => { rejectTimeout = reject })
    const timer = setTimeout(() => {
      const error = new Error('REVIEW_TIMEOUT')
      controller.abort(error)
      rejectTimeout(error)
    }, this.config.reviewTimeoutMs)
    let run: Awaited<ReturnType<typeof this.ctx.subagents.start>> | undefined
    try {
      run = await this.ctx.subagents.start(this.config.laneSubagentProvider, {
        label: `Matt Flow ${axis} reviewer`, parent: root, signal: controller.signal, maxDepth: this.config.laneMaxDepth,
        agentOptions: { maxTokens: 16384 },
        toolFilter: { allow: [] },
        persona: `You are a read-only ${axis} reviewer. Never edit files. Return only structured findings.`,
        outputSchema: { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocking', 'warning', 'note'] }, title: { type: 'string' }, explanation: { type: 'string' } }, required: ['severity', 'title', 'explanation'], additionalProperties: false } } }, required: ['findings'], additionalProperties: false },
        prompt: [{ type: 'text', text: `Review this immutable candidate on the ${axis} axis. Do not edit files or use tools. Return exactly one JSON object with a findings array, at most three concise findings. Do not narrate your process. Treat integrationCommit, integrationBranch, integrationWorktreePath, and laneCommits as the recorded provenance chain; report a provenance finding only when those fields are missing or internally inconsistent, not merely because the integration commit differs from an individual Lane commit. Lane resultSummary values are Host-generated summaries; do not infer a different commit from free-form Agent receipt text. Candidate:\n${candidate}` }],
      })
      const result = await Promise.race([run.result, timeout])
      if (result.stopReason !== 'completed') throw new Error(`REVIEW_RESULT_INVALID: stopReason=${result.stopReason}`)
      return parseReviewFindings(result.structured, axis)
    } finally {
      clearTimeout(timer)
      controller.abort()
      await run?.dispose()
    }
  }

  /** Return a deterministic, side-effect-free Frontier plan for the current Flow. */
  @Remote('previewFrontier')
  previewFrontier(request: PreviewFrontierRequest): FrontierPlan {
    const current = this.repository.get(FlowId(request.flowId))
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    return frontierFor(current, this.config.defaultMaxConcurrentLanes)
  }

  /** Admit all currently unclaimed Frontier Lanes in one CAS and run them in the background. */
  @Remote('startFrontier')
  async startFrontier(request: StartFrontierRequest): Promise<FlowRecord> {
    if (request.confirmedConcurrency !== true) throw new Error('FRONTIER_CONFIRMATION_REQUIRED: confirm the concurrency Gate before starting Lanes')
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    const maxConcurrent = request.maxConcurrent ?? this.config.defaultMaxConcurrentLanes
    if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > this.config.hardMaxConcurrentLanes) throw new Error(`FRONTIER_CONCURRENCY_INVALID: ${maxConcurrent}`)
    const plan = frontierFor(current, maxConcurrent)
    if (plan.tickets.length === 0) throw new Error('FRONTIER_EMPTY: no unclaimed Ticket is ready')
    const lanes = current.lanes.filter(lane => lane.status === 'ready' && plan.tickets.includes(current.tickets.find(ticket => ticket.id === lane.ticketId)?.id ?? ''))
    if (lanes.length === 0 || lanes.length > maxConcurrent) throw new Error('FRONTIER_LANES_NOT_READY: prepare and provision the Frontier Lanes first')
    const root = await this.rootForFlow(current)
    if (root === undefined) throw new Error('ROOT_AGENT_UNAVAILABLE: Frontier needs a live root Agent')
    const packets = await Promise.all(lanes.map(async lane => {
      const artifact = current.artifacts.find(item => item.id === lane.packetArtifactId)
      if (artifact === undefined) throw new Error(`PACKET_NOT_FOUND: ${lane.packetArtifactId ?? lane.id}`)
      return { lane, packet: (await this.artifactStore.read(artifact)).toString('utf8') }
    }))
    const running = await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      lanes: record.lanes.map(lane => packets.some(item => item.lane.id === lane.id) ? { ...lane, status: 'running' as const, updatedAt: Date.now() } : lane),
      updatedAt: Date.now(),
    }))
    for (const item of packets) void this.driveLane(flowId, item.lane, running, root, item.packet)
    return running
  }

  /** Publish the current Ticket Graph to the repository-local Markdown tracker. */
  @Remote('publish')
  async publish(request: PublishTicketGraphRequest): Promise<FlowRecord> {
    const flowId = FlowId(request.flowId)
    const current = this.repository.get(flowId)
    if (current === undefined) throw new Error(`FLOW_NOT_FOUND: ${request.flowId}`)
    if (current.tickets.length === 0) throw new Error('GRAPH_INVALID: cannot publish an empty Ticket Graph')
    validateTicketGraph(current.tickets)
    const publication = await this.tracker.publish(current)
    return await this.repository.update(flowId, request.expectedRevision, record => ({
      ...record,
      revision: record.revision + 1,
      tracker: publication,
      updatedAt: Date.now(),
    }))
  }

  private async snapshotSkills(repoRoot: string, root?: Agent): Promise<NonNullable<FlowRecord['skillSnapshot']>> {
    const observation = await this.ctx.skills.snapshot({ scope: root, cwd: repoRoot })
    if (!observation.complete) throw new Error('SKILL_SETUP_GATE: skill discovery did not complete; install the required Matt Skills and retry')
    const summaries = [...observation.skills].sort((a, b) => a.name.localeCompare(b.name))
    const names = summaries.map(skill => skill.name)
    const missing = this.config.requiredSkills.filter(name => !names.includes(name))
    if (missing.length > 0) throw new Error(`SKILL_SETUP_GATE: missing required skills: ${missing.join(', ')}`)
    const entries: SkillSnapshotEntry[] = []
    for (const skill of summaries) {
      const definition = await this.ctx.skills.get(skill.name, { scope: root, cwd: repoRoot })
      if (definition === undefined) throw new Error(`SKILL_SETUP_GATE: skill body unavailable: ${skill.name}`)
      entries.push({
        name: skill.name,
        provider: skill.provider,
        source: skill.source,
        invocation: skill.invocation,
        contentSha256: createHash('sha256').update(definition.content).digest('hex'),
      })
    }
    const aggregateSha256 = createHash('sha256').update(JSON.stringify(entries)).digest('hex')
    return { status: 'ready', count: entries.length, names, entries, aggregateSha256 }
  }

  private async ensureRootAgent(flowId: FlowId, repoRoot: string): Promise<Agent> {
    const existing = this.ctx.agents.roots().find(agent => agent.session.header.cwd === repoRoot)
    if (existing !== undefined) return existing
    const handle = await this.ctx.agents.create({
      sessionId: SessionId(`session-matt-flow-${randomUUID()}`),
      agentOptions: this.ctx.agentDefaultModel.currentSelection(),
      meta: { cwd: repoRoot, agentPreset: 'standard' },
      setup: async agentCtx => {
        const presets = this.ctx.get('agentPresets')
        if (presets === undefined) throw new Error('AGENT_PRESETS_UNAVAILABLE: the standard preset is required for Flow planning')
        await presets.mount(agentCtx, 'standard')
      },
    })
    this.flowHandles.set(flowId, handle)
    return handle.agent
  }

  private async rootForFlow(flow: Pick<FlowRecord, 'id' | 'rootSessionId' | 'repoRoot'>): Promise<Agent | undefined> {
    if (flow.rootSessionId === undefined) return this.ctx.agents.roots()[0]
    const live = this.ctx.agents.get(SessionId(flow.rootSessionId))
    if (live !== undefined) return live
    const handle = await this.ctx.agents.resume({
      resumeSessionId: SessionId(flow.rootSessionId),
      agentOptions: this.ctx.agentDefaultModel.currentSelection(),
      setup: async agentCtx => {
        const presets = this.ctx.get('agentPresets')
        if (presets === undefined) throw new Error('AGENT_PRESETS_UNAVAILABLE: the standard preset is required for Flow resume')
        await presets.mount(agentCtx, 'standard')
      },
    })
    this.flowHandles.set(flow.id, handle)
    return handle.agent
  }

  private async ensureReviewAgent(flowId: FlowId, repoRoot: string): Promise<Agent> {
    const existing = this.reviewHandles.get(flowId)
    if (existing !== undefined) return existing.agent
    const handle = await this.ctx.agents.create({
      sessionId: SessionId(`session-matt-review-${randomUUID()}`),
      agentOptions: this.ctx.agentDefaultModel.currentSelection(),
      meta: { cwd: repoRoot, agentPreset: this.config.reviewAgentPreset },
      setup: async agentCtx => {
        const presets = this.ctx.get('agentPresets')
        if (presets === undefined) throw new Error('AGENT_PRESETS_UNAVAILABLE: reviewer preset is required')
        await presets.mount(agentCtx, this.config.reviewAgentPreset)
      },
    })
    this.reviewHandles.set(flowId, handle)
    return handle.agent
  }

  private async loadSkill(name: string, repoRoot: string, root?: Agent): Promise<SkillDefinition> {
    if (root === undefined) throw new Error('ROOT_AGENT_UNAVAILABLE: start a root DSH session before planning')
    const available = await this.ctx.skills.list({ cwd: repoRoot, scope: root })
    const skill = await this.ctx.skills.get(name, { cwd: repoRoot, scope: root })
    if (skill === undefined) throw new Error(`SKILL_MISSING: ${name}; available=${available.map(item => item.name).join(',')}`)
    return skill
  }

  private async startPlanning(root: Agent, skill: SkillDefinition, flow: FlowRecord): Promise<void> {
    root.inject(createMessage({
      role: 'user',
      content: [{ type: 'text', text: renderSkillContent(skill) }],
      source: { kind: 'plugin', plugin: name, form: 'instructions' },
    }))
    root.followup(createMessage({
      role: 'user',
      content: [{ type: 'text', text: `You are the planning Agent for Matt Skills Flow ${flow.id}. Follow the injected grill-with-docs skill for this repository. Do not edit code. Ask the next decision frontier and keep the user in control. When the round is complete, report the confirmed decisions and unresolved questions in your final response.` }],
      source: { kind: 'user' },
    }))
  }
}

export default MattSkillsFlowService

function buildAcceptanceTrace(flow: FlowRecord, completed: readonly FlowRecord['lanes'][number][]): AcceptanceTrace[] {
  return flow.tickets.flatMap(ticket => {
    const lane = completed.find(item => item.ticketId === ticket.id)
    return (ticket.acceptanceCriteria ?? []).map(criterion => ({
      ticketId: ticket.id,
      criterion,
      source: `ticket:${ticket.id}`,
      productionPath: lane === undefined ? 'missing-lane' : `lane:${lane.id}:worktree`,
      falsifyingCase: lane === undefined ? 'missing-lane-receipt' : `lane:${lane.id}:status!=integrated-or-no-changed-file`,
      observableSignal: lane?.resultArtifactId === undefined || lane.resultSha256 === undefined || lane.changedFiles === undefined || lane.changedFiles.length === 0
        ? 'missing-lane-receipt'
        : `artifact:${lane.resultArtifactId}:${lane.resultSha256}:changedFiles=${lane.changedFiles.join(',')}`,
      status: lane?.status === 'integrated' && lane.resultArtifactId !== undefined && lane.resultSha256 !== undefined && lane.changedFiles !== undefined && lane.changedFiles.length > 0 ? 'covered' as const : 'missing' as const,
    }))
  })
}

function parseLaneResult(value: unknown): { status: 'completed' | 'blocked' | 'failed'; summary: string; changedFiles: string[]; commit?: string; question?: string; questionContext?: string; questionOptions?: string[]; questionSourceRefs?: string[] } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('LANE_RESULT_INVALID: structured result must be an object')
  const result = value as Record<string, unknown>
  const status = result.status
  const summary = result.summary
  const changedFiles = result.changedFiles
  const commit = result.commit
  const question = result.question
  const questionContext = result.questionContext
  const questionOptions = result.questionOptions
  const questionSourceRefs = result.questionSourceRefs
  if ((status !== 'completed' && status !== 'blocked' && status !== 'failed') || typeof summary !== 'string' || !Array.isArray(changedFiles) || changedFiles.some(file => typeof file !== 'string') || (commit !== undefined && typeof commit !== 'string') || (question !== undefined && typeof question !== 'string') || (questionContext !== undefined && typeof questionContext !== 'string') || (questionOptions !== undefined && (!Array.isArray(questionOptions) || questionOptions.some(option => typeof option !== 'string'))) || (questionSourceRefs !== undefined && (!Array.isArray(questionSourceRefs) || questionSourceRefs.some(sourceRef => typeof sourceRef !== 'string'))) || (status === 'blocked' && typeof question !== 'string')) {
    throw new Error('LANE_RESULT_INVALID: status, summary, and changedFiles are required')
  }
  return { status, summary, changedFiles: [...changedFiles] as string[], ...(commit === undefined ? {} : { commit }), ...(question === undefined ? {} : { question }), ...(questionContext === undefined ? {} : { questionContext }), ...(questionOptions === undefined ? {} : { questionOptions: [...questionOptions] as string[] }), ...(questionSourceRefs === undefined ? {} : { questionSourceRefs: [...questionSourceRefs] as string[] }) }
}

function parseReviewFindings(value: unknown, axis: ReviewFinding['axis']): ReviewFinding[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('REVIEW_RESULT_INVALID: structured result must be an object')
  const findings = (value as Record<string, unknown>).findings
  if (!Array.isArray(findings)) throw new Error('REVIEW_RESULT_INVALID: findings must be an array')
  return findings.map((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new Error('REVIEW_RESULT_INVALID: finding must be an object')
    const finding = item as Record<string, unknown>
    if ((finding.severity !== 'blocking' && finding.severity !== 'warning' && finding.severity !== 'note') || typeof finding.title !== 'string' || typeof finding.explanation !== 'string') throw new Error('REVIEW_RESULT_INVALID: finding fields are invalid')
    return { id: `finding-${axis}-${index + 1}-${randomUUID().slice(0, 8)}`, axis, severity: finding.severity, title: finding.title, explanation: finding.explanation }
  })
}
