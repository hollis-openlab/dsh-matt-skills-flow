import { describe, expect, it } from 'vitest'
import { buildAdmissionMatrix } from '../src/index.ts'
import { createFlowRecord, type FlowRecord } from '../src/domain.ts'

const config = {
  trackerKind: 'local' as const,
  defaultMaxConcurrentLanes: 1,
  hardMaxConcurrentLanes: 4,
  requiredSkills: ['grill-with-docs'],
  artifactRoot: '/tmp/matt-flow-artifacts',
  maxArtifactBytes: 1024,
  laneTimeoutMs: 60_000,
  laneMaxTokens: 2048,
  laneMaxDepth: 1,
  defaultMaxReviewRounds: 1,
  hardMaxReviewRounds: 2,
  worktreeRootName: '.dsh-worktrees/matt-flow',
}

function completeFlow(): FlowRecord {
  const flow = createFlowRecord({ id: 'flow-admission' as FlowRecord['id'], title: 'Admission', repoRoot: '/tmp/project', now: 100 })
  return {
    ...flow,
    decisions: [{ id: 'decision-a', question: 'Scope?', answer: 'Small', status: 'active', createdAt: 100 }],
    spec: { status: 'approved', artifactId: 'artifact-spec', sha256: 'a'.repeat(64), createdAt: 100, approvedAt: 101 },
    tickets: [{ id: 'ticket-a', title: 'Implement', status: 'integrated', blockedBy: [], dependsOn: [], acceptanceCriteria: ['The change is observable'] }],
    lanes: [{ id: 'lane-a', ticketId: 'ticket-a', status: 'integrated', resultArtifactId: 'artifact-lane', resultSha256: 'b'.repeat(64), changedFiles: ['src/change.ts'], updatedAt: 100 }],
    tracker: { kind: 'local', root: '/tmp/project/.scratch', graphPath: 'graph.json', graphSha256: 'c'.repeat(64), publishedAt: 100 },
    skillSnapshot: { status: 'ready', count: 1, names: ['grill-with-docs'], missing: [], aggregateSha256: 'd'.repeat(64) },
  }
}

describe('review admission matrix', () => {
  it('records covered and explicitly not-applicable dimensions', () => {
    const matrix = buildAdmissionMatrix(completeFlow(), config)
    expect(matrix.lifecycle.find(item => item.id === 'lifecycle:planning')).toMatchObject({ status: 'covered' })
    expect(matrix.lifecycle.find(item => item.id === 'lifecycle:questions')).toMatchObject({ status: 'not-applicable' })
    expect(matrix.configuration.every(item => item.status === 'covered')).toBe(true)
    expect([...matrix.lifecycle, ...matrix.configuration].some(item => item.status === 'missing' || item.status === 'deferred')).toBe(false)
  })

  it('marks pending Questions as an admission blocker', () => {
    const matrix = buildAdmissionMatrix({ ...completeFlow(), questions: [{ id: 'question-a', question: 'Which API?', status: 'pending', createdAt: 100 }] }, config)
    expect(matrix.lifecycle.find(item => item.id === 'lifecycle:questions')).toMatchObject({ status: 'missing', evidence: ['pending-questions:1', 'questions:1'] })
  })

  it('marks invalid limits as missing instead of silently defaulting them', () => {
    const matrix = buildAdmissionMatrix(completeFlow(), { ...config, defaultMaxConcurrentLanes: 4, hardMaxConcurrentLanes: 2, defaultMaxReviewRounds: 3, hardMaxReviewRounds: 2 })
    expect(matrix.configuration.find(item => item.id === 'configuration:concurrency')).toMatchObject({ status: 'missing' })
    expect(matrix.configuration.find(item => item.id === 'configuration:review-rounds')).toMatchObject({ status: 'missing' })
  })
})
