import { z } from 'zod';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
export const FlowId = (value) => value;
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
];
export const flowPhaseSchema = z.enum(FLOW_PHASES);
const decisionSchema = z.object({
    id: z.string(), question: z.string(), answer: z.string(), status: z.enum(['active', 'superseded']),
    createdAt: z.number(), supersededBy: z.string().optional(),
}).strict();
const ticketSchema = z.object({
    id: z.string(), title: z.string(), status: z.enum(['open', 'blocked', 'running', 'completed', 'failed', 'integrated']),
    blockedBy: z.array(z.string()),
}).strict();
const laneSchema = z.object({
    id: z.string(), ticketId: z.string(),
    status: z.enum(['preparing', 'ready', 'running', 'blocked', 'completed', 'failed', 'cancelled', 'integrated']),
    branch: z.string().optional(), worktreePath: z.string().optional(), updatedAt: z.number(),
}).strict();
const questionSchema = z.object({
    id: z.string(), ticketId: z.string().optional(), question: z.string(),
    status: z.enum(['pending', 'answered', 'dismissed']), createdAt: z.number(), answer: z.string().optional(),
}).strict();
export const flowRecordSchema = z.object({
    schemaVersion: z.literal(1), id: z.string(), revision: z.number().int().positive(), title: z.string(),
    workspaceId: z.string().optional(), repoRoot: z.string(), phase: flowPhaseSchema, nextAction: z.string(),
    createdAt: z.number(), updatedAt: z.number(), decisions: z.array(decisionSchema), tickets: z.array(ticketSchema),
    lanes: z.array(laneSchema), questions: z.array(questionSchema),
    skillSnapshot: z.object({ status: z.enum(['missing', 'ready', 'unknown']), count: z.number().int().nonnegative(), aggregateSha256: z.string().optional() }).strict().optional(),
    acceptance: z.object({ status: z.enum(['not-ready', 'ready', 'accepted', 'rejected']), candidateCommit: z.string().optional() }).strict().optional(),
}).strict();
export const mattSkillsFlowDomain = defineDomain({
    name: 'matt-skills-flow',
    version: 1,
    tables: {
        flows: domainTable(flowRecordSchema),
    },
});
export function nextActionFor(phase) {
    switch (phase) {
        case 'intake': return 'Start planning with grill-with-docs';
        case 'grilling': return 'Continue the decision round';
        case 'spec-review': return 'Review and approve the Spec';
        case 'spec-ready': return 'Create tracer-bullet Tickets';
        case 'ticketing': return 'Review the Ticket Graph';
        case 'tickets-ready': return 'Preview the executable Frontier';
        case 'execution-preflight': return 'Approve Lane execution';
        case 'running': return 'Monitor active Lanes';
        case 'needs-human': return 'Answer blocked Questions';
        case 'review-admission': return 'Check review admission';
        case 'reviewing': return 'Review Standards and Spec findings';
        case 'remediation': return 'Run the bounded remediation round';
        case 'ready-for-acceptance': return 'Accept or reject the candidate';
        case 'accepted': return 'Flow accepted';
        case 'paused': return 'Resume the Flow';
        case 'failed': return 'Inspect recovery details';
        case 'aborted': return 'Flow aborted';
        case 'wayfinding': return 'Resolve the next decision ticket';
        case 'researching': return 'Collect the required research evidence';
        case 'prototyping': return 'Run the prototype decision';
    }
}
export function createFlowRecord(input) {
    return {
        schemaVersion: 1,
        id: input.id,
        revision: 1,
        title: input.title,
        ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        repoRoot: input.repoRoot,
        phase: 'intake',
        nextAction: nextActionFor('intake'),
        createdAt: input.now,
        updatedAt: input.now,
        decisions: [],
        tickets: [],
        lanes: [],
        questions: [],
        skillSnapshot: { status: 'unknown', count: 0 },
        acceptance: { status: 'not-ready' },
    };
}
//# sourceMappingURL=domain.js.map