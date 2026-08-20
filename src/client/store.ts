import type { FlowRecord, FrontierPlan } from '../domain.ts'
import type { FlowRemote } from '../remote.ts'

export interface FlowUiState {
  readonly open: boolean
  readonly busy: boolean
  readonly error?: string
  readonly flows: readonly FlowRecord[]
  readonly selected?: string
  readonly showCreate: boolean
  readonly frontier?: FrontierPlan
}

export class FlowUiStore {
  private listeners = new Set<() => void>()
  private state: FlowUiState = { open: false, busy: false, flows: [], showCreate: false }

  constructor(private readonly remote: FlowRemote) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  snapshot(): FlowUiState { return this.state }

  open(): void {
    this.state = { ...this.state, open: true, error: undefined }
    this.emit()
    void this.load()
  }

  close(): void {
    this.state = { ...this.state, open: false, showCreate: false }
    this.emit()
  }

  toggleCreate(): void {
    this.state = { ...this.state, showCreate: !this.state.showCreate, error: undefined }
    this.emit()
  }

  select(flowId: string): void {
    this.state = { ...this.state, selected: flowId }
    this.emit()
  }

  async load(): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.list()
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: [...result.value.flows], selected: this.state.selected ?? result.value.flows[0]?.id }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async create(title: string, repoRoot: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.create({ title, repoRoot })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, showCreate: false, flows: [result.value, ...this.state.flows], selected: result.value.id }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async advance(flow: FlowRecord, action: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.advance({ flowId: flow.id, expectedRevision: flow.revision, action })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async decide(flow: FlowRecord, question: string, answer: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.decide({ flowId: flow.id, expectedRevision: flow.revision, question, answer })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async ticket(flow: FlowRecord, title: string, dependsOn: string[] = [], acceptanceCriteria: string[] = [], workflowRole?: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.ticket({ flowId: flow.id, expectedRevision: flow.revision, title, dependsOn, acceptanceCriteria, ...(workflowRole === undefined ? {} : { workflowRole }) })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async updateTicket(flow: FlowRecord, ticketId: string, title: string, dependsOn: string[], acceptanceCriteria: string[], workflowRole?: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.updateTicket({ flowId: flow.id, expectedRevision: flow.revision, ticketId, title, dependsOn, acceptanceCriteria, ...(workflowRole === undefined ? {} : { workflowRole }) })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async startActivity(flow: FlowRecord, kind: 'research' | 'prototype' | 'wayfinder', question: string, expectedEvidence?: string): Promise<void> {
    await this.mutateFlow(flow, request => this.remote.startActivity({ ...request, kind, question, ...(expectedEvidence === undefined ? {} : { expectedEvidence }) }))
  }

  async completeActivity(flow: FlowRecord, activityId: string, output: string, sourceRef: string, handoff?: 'to-grilling' | 'to-spec' | 'to-tickets'): Promise<void> {
    await this.mutateFlow(flow, request => this.remote.completeActivity({ ...request, activityId, output, sourceRef, ...(handoff === undefined ? {} : { handoff }) }))
  }

  async rejectAcceptance(flow: FlowRecord, reason: string, returnTo: 'grilling' | 'wayfinding' | 'ticketing'): Promise<void> {
    if (flow.review === undefined) return
    await this.mutateFlow(flow, request => this.remote.rejectAcceptance({ ...request, candidateArtifactId: flow.review?.candidateArtifactId ?? '', reason, returnTo }))
  }

  async lane(flow: FlowRecord, ticketId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.lane({ flowId: flow.id, expectedRevision: flow.revision, ticketId })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async publish(flow: FlowRecord): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.publish({ flowId: flow.id, expectedRevision: flow.revision })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async provisionLane(flow: FlowRecord, laneId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.provisionLane({ flowId: flow.id, expectedRevision: flow.revision, laneId })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async runLane(flow: FlowRecord, laneId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.runLane({ flowId: flow.id, expectedRevision: flow.revision, laneId })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async prepareAcceptance(flow: FlowRecord): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.prepareAcceptance({ flowId: flow.id, expectedRevision: flow.revision })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async accept(flow: FlowRecord): Promise<void> {
    if (flow.review === undefined || flow.acceptance?.candidateCommit === undefined) {
      this.state = { ...this.state, error: 'ACCEPTANCE_GATE_BLOCKED: candidate commit is missing' }
      this.emit()
      return
    }
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.accept({ flowId: flow.id, expectedRevision: flow.revision, candidateArtifactId: flow.review.candidateArtifactId, accept: true })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async cleanup(flow: FlowRecord, laneId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.cleanup({ flowId: flow.id, expectedRevision: flow.revision, laneId })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async integrate(flow: FlowRecord, laneId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.integrate({ flowId: flow.id, expectedRevision: flow.revision, laneId })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async answerQuestion(flow: FlowRecord, questionId: string, answer: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.answerQuestion({ flowId: flow.id, expectedRevision: flow.revision, questionId, answer })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async resume(flow: FlowRecord): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.resume({ flowId: flow.id, expectedRevision: flow.revision })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async previewFrontier(flow: FlowRecord): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.previewFrontier({ flowId: flow.id })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, frontier: result.value }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async startFrontier(flow: FlowRecord, maxConcurrent?: number): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.startFrontier({ flowId: flow.id, expectedRevision: flow.revision, ...(maxConcurrent === undefined ? {} : { maxConcurrent }) })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async requestReview(flow: FlowRecord): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.requestReview({ flowId: flow.id, expectedRevision: flow.revision })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async disposeFinding(flow: FlowRecord, findingId: string): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await this.remote.disposeFinding({ flowId: flow.id, expectedRevision: flow.revision, findingId, kind: 'rejected', reason: '已由人工核对，作为当前候选的已知偏差记录。' })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  async generateSpec(flow: FlowRecord): Promise<void> {
    await this.mutateFlow(flow, request => this.remote.generateSpec(request))
  }

  async approveSpec(flow: FlowRecord): Promise<void> {
    await this.mutateFlow(flow, request => this.remote.approveSpec(request))
  }

  async exportEvidence(flow: FlowRecord): Promise<void> {
    await this.mutateFlow(flow, request => this.remote.exportEvidence({ flowId: request.flowId }))
  }

  private async mutateFlow(flow: FlowRecord, operation: (request: { flowId: string; expectedRevision: number }) => Promise<Awaited<ReturnType<FlowRemote['get']>> >): Promise<void> {
    this.state = { ...this.state, busy: true, error: undefined }
    this.emit()
    try {
      const result = await operation({ flowId: flow.id, expectedRevision: flow.revision })
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) }
    } catch (error) {
      this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) }
    }
    this.emit()
  }

  private emit(): void { for (const listener of this.listeners) listener() }
}
