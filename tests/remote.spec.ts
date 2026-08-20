import { describe, expect, it } from 'vitest'
import { ADVANCE_FLOW_SCHEMA, CREATE_FLOW_SCHEMA, TYPERT_REMOTE } from '../src/remote.ts'

describe('Matt Skills Remote', () => {
  it('exposes the Flow and Decision Ledger operations', () => {
    expect(TYPERT_REMOTE.descriptors.map(descriptor => descriptor.method)).toEqual(['list', 'get', 'create', 'advance', 'decide', 'ticket', 'lane', 'publish', 'provisionLane', 'runLane', 'prepareAcceptance', 'accept', 'cleanup', 'integrate', 'answerQuestion', 'resume', 'previewFrontier', 'startFrontier', 'requestReview', 'disposeFinding', 'generateSpec', 'approveSpec', 'exportEvidence'])
  })

  it('rejects incomplete create and advance requests', () => {
    expect(() => CREATE_FLOW_SCHEMA.parse({ title: '', repoRoot: '' })).toThrow()
    expect(() => ADVANCE_FLOW_SCHEMA.parse({ flowId: 'flow-a', expectedRevision: 0, action: 'start-feature' })).toThrow()
    expect(() => ADVANCE_FLOW_SCHEMA.parse({ flowId: 'flow-a', expectedRevision: 1, phase: 'grilling' })).toThrow()
    expect(CREATE_FLOW_SCHEMA.parse({ title: 'Login flow', repoRoot: '/tmp/project' })).toEqual({ title: 'Login flow', repoRoot: '/tmp/project' })
  })
})
