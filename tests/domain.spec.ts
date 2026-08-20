import { describe, expect, it } from 'vitest'
import { createFlowRecord, defaultTransitionFor, evaluateTransitionGate, flowRecordSchema, frontierFor, nextActionFor, transitionFor, validateTicketGraph, type FlowRecord } from '../src/domain.ts'

describe('Flow domain', () => {
  it('creates a durable intake record with an actionable next step', () => {
    const flow = createFlowRecord({ id: 'flow-test' as FlowRecord['id'], title: 'Login flow', repoRoot: '/tmp/project', now: 100 })
    expect(flowRecordSchema.parse(flow)).toEqual(flow)
    expect(flow.phase).toBe('intake')
    expect(flow.nextAction).toBe('Start planning with grill-with-docs')
    expect(flow.revision).toBe(1)
  })

  it('keeps the phase labels deterministic', () => {
    expect(nextActionFor('ready-for-acceptance')).toBe('Accept or reject the candidate')
    expect(nextActionFor('accepted')).toBe('Flow accepted')
  })

  it('accepts a complete content-hashed skill snapshot', () => {
    const flow = {
      ...createFlowRecord({ id: 'flow-snapshot' as FlowRecord['id'], title: 'Snapshot', repoRoot: '/tmp/project', now: 100 }),
      skillSnapshot: {
        status: 'ready' as const,
        count: 1,
        names: ['grill-with-docs'],
        entries: [{
          name: 'grill-with-docs',
          provider: 'filesystem',
          source: 'project-agents',
          invocation: { modelInvocable: true, userInvocable: true },
          contentSha256: 'a'.repeat(64),
        }],
        aggregateSha256: 'b'.repeat(64),
      },
    }
    expect(flowRecordSchema.parse(flow)).toEqual(flow)
  })

  it('resolves explicit actions instead of allowing arbitrary phase writes', () => {
    const flow = createFlowRecord({ id: 'flow-transition' as FlowRecord['id'], title: 'Transitions', repoRoot: '/tmp/project', now: 100 })
    expect(defaultTransitionFor(flow)).toEqual({ action: 'start-feature', to: 'grilling' })
    expect(transitionFor(flow, 'start-feature')).toEqual({ action: 'start-feature', to: 'grilling' })
    expect(transitionFor(flow, 'approve-spec')).toBeUndefined()
  })

  it('blocks planning until the Skill Setup Gate passes', () => {
    const flow = createFlowRecord({ id: 'flow-gate' as FlowRecord['id'], title: 'Gates', repoRoot: '/tmp/project', now: 100 })
    expect(evaluateTransitionGate(flow, 'start-feature')).toEqual({
      kind: 'blocked', code: 'SKILL_SETUP_GATE',
      message: 'A complete Matt Skills snapshot is required before planning starts', evidence: [],
    })
    expect(evaluateTransitionGate({ ...flow, skillSnapshot: { status: 'ready', count: 1 } }, 'start-feature')).toEqual({
      kind: 'pass', evidence: ['skill-snapshot:ready'],
    })
  })

  it('validates Ticket Graph dependency fields', () => {
    const flow = {
      ...createFlowRecord({ id: 'flow-ticket' as FlowRecord['id'], title: 'Tickets', repoRoot: '/tmp/project', now: 100 }),
      tickets: [{ id: 'ticket-a', title: 'First', status: 'open' as const, blockedBy: [], dependsOn: [] }],
    }
    expect(flowRecordSchema.parse(flow).tickets[0]?.dependsOn).toEqual([])
  })

  it('computes an ordered unclaimed frontier from terminal dependencies', () => {
    const flow = {
      ...createFlowRecord({ id: 'flow-frontier' as FlowRecord['id'], title: 'Frontier', repoRoot: '/tmp/project', now: 100 }),
      tickets: [
        { id: 'ticket-b', title: 'Second', status: 'open' as const, blockedBy: ['ticket-a'], dependsOn: ['ticket-a'] },
        { id: 'ticket-a', title: 'First', status: 'completed' as const, blockedBy: [], dependsOn: [] },
      ],
    }
    expect(frontierFor(flow, 2).tickets).toEqual(['ticket-b'])
    expect(frontierFor({ ...flow, lanes: [{ id: 'lane-b', ticketId: 'ticket-b', status: 'ready' as const, updatedAt: 100 }] }, 2).tickets).toEqual(['ticket-b'])
    expect(frontierFor({ ...flow, tickets: [
      { id: 'ticket-c', title: 'Third', status: 'open' as const, blockedBy: [], dependsOn: [] },
      { id: 'ticket-d', title: 'Fourth', status: 'open' as const, blockedBy: [], dependsOn: [] },
    ] }, 1).tickets).toEqual(['ticket-c'])
  })

  it('rejects Ticket Graph cycles before publication', () => {
    expect(() => validateTicketGraph([
      { id: 'ticket-a', dependsOn: ['ticket-b'] },
      { id: 'ticket-b', dependsOn: ['ticket-a'] },
    ])).toThrow('TICKET_GRAPH_CYCLE')
  })

  it('persists structured blocked Question evidence', () => {
    const flow = createFlowRecord({ id: 'flow-question' as FlowRecord['id'], title: 'Question', repoRoot: '/tmp/project', now: 100 })
    const parsed = flowRecordSchema.parse({
      ...flow,
      questions: [{ id: 'question-a', ticketId: 'ticket-a', question: 'Which API?', context: 'The provider differs by deployment', options: ['REST', 'GraphQL'], sourceRefs: ['ticket-a', 'decision-b'], status: 'pending', createdAt: 100 }],
    })
    expect(parsed.questions[0]).toMatchObject({ options: ['REST', 'GraphQL'], sourceRefs: ['ticket-a', 'decision-b'] })
  })
})
