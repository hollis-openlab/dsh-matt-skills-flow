import { z } from 'zod';
const flowSchema = z.object({
    schemaVersion: z.literal(1), id: z.string(), revision: z.number(), title: z.string(), workspaceId: z.string().optional(),
    repoRoot: z.string(), phase: z.string(), nextAction: z.string(), createdAt: z.number(), updatedAt: z.number(),
    decisions: z.array(z.unknown()), tickets: z.array(z.unknown()), lanes: z.array(z.unknown()), questions: z.array(z.unknown()),
    skillSnapshot: z.unknown().optional(), acceptance: z.unknown().optional(),
}).strict();
const createRequestSchema = z.object({ title: z.string().min(1), repoRoot: z.string().min(1), workspaceId: z.string().optional() }).strict();
const idRequestSchema = z.object({ flowId: z.string() }).strict();
const advanceRequestSchema = z.object({ flowId: z.string(), expectedRevision: z.number().int().positive(), phase: z.string() }).strict();
const flowListSchema = z.object({ flows: z.array(flowSchema) }).strict();
export const CREATE_FLOW_SCHEMA = createRequestSchema;
export const ADVANCE_FLOW_SCHEMA = advanceRequestSchema;
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
    ],
};
export default TYPERT_REMOTE;
export const inject = ['remote'];
export async function apply(ctx) {
    return await ctx.remote.$mount(TYPERT_REMOTE);
}
//# sourceMappingURL=remote.js.map