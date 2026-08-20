import { z } from 'zod';
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { FlowRecord } from './domain.ts';
export declare const CREATE_FLOW_SCHEMA: z.ZodObject<{
    title: z.ZodString;
    repoRoot: z.ZodString;
    workspaceId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const ADVANCE_FLOW_SCHEMA: z.ZodObject<{
    flowId: z.ZodString;
    expectedRevision: z.ZodNumber;
    phase: z.ZodString;
}, z.core.$strict>;
export declare const TYPERT_REMOTE: {
    package: string;
    descriptors: ({
        id: string;
        service: string;
        namespace: string;
        method: string;
        invocation: {
            kind: "direct";
        };
        parameters: never[];
        result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodObject<{
                flows: z.ZodArray<z.ZodObject<{
                    schemaVersion: z.ZodLiteral<1>;
                    id: z.ZodString;
                    revision: z.ZodNumber;
                    title: z.ZodString;
                    workspaceId: z.ZodOptional<z.ZodString>;
                    repoRoot: z.ZodString;
                    phase: z.ZodString;
                    nextAction: z.ZodString;
                    createdAt: z.ZodNumber;
                    updatedAt: z.ZodNumber;
                    decisions: z.ZodArray<z.ZodUnknown>;
                    tickets: z.ZodArray<z.ZodUnknown>;
                    lanes: z.ZodArray<z.ZodUnknown>;
                    questions: z.ZodArray<z.ZodUnknown>;
                    skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                    acceptance: z.ZodOptional<z.ZodUnknown>;
                }, z.core.$strict>>;
            }, z.core.$strict>;
        };
        cancellation: {
            parameter: "signal";
        };
        sourceLocation: {
            file: string;
            line: number;
            column: number;
        };
    } | {
        id: string;
        service: string;
        namespace: string;
        method: string;
        invocation: {
            kind: "direct";
        };
        parameters: {
            name: string;
            wire: string;
            source: "json";
            codec: {
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodObject<{
                    flowId: z.ZodString;
                }, z.core.$strict>;
            };
        }[];
        result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                id: z.ZodString;
                revision: z.ZodNumber;
                title: z.ZodString;
                workspaceId: z.ZodOptional<z.ZodString>;
                repoRoot: z.ZodString;
                phase: z.ZodString;
                nextAction: z.ZodString;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
                decisions: z.ZodArray<z.ZodUnknown>;
                tickets: z.ZodArray<z.ZodUnknown>;
                lanes: z.ZodArray<z.ZodUnknown>;
                questions: z.ZodArray<z.ZodUnknown>;
                skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                acceptance: z.ZodOptional<z.ZodUnknown>;
            }, z.core.$strict>;
        };
        cancellation: {
            parameter: "signal";
        };
        sourceLocation: {
            file: string;
            line: number;
            column: number;
        };
    } | {
        id: string;
        service: string;
        namespace: string;
        method: string;
        invocation: {
            kind: "direct";
        };
        parameters: {
            name: string;
            wire: string;
            source: "json";
            codec: {
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodObject<{
                    title: z.ZodString;
                    repoRoot: z.ZodString;
                    workspaceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>;
            };
        }[];
        result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                id: z.ZodString;
                revision: z.ZodNumber;
                title: z.ZodString;
                workspaceId: z.ZodOptional<z.ZodString>;
                repoRoot: z.ZodString;
                phase: z.ZodString;
                nextAction: z.ZodString;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
                decisions: z.ZodArray<z.ZodUnknown>;
                tickets: z.ZodArray<z.ZodUnknown>;
                lanes: z.ZodArray<z.ZodUnknown>;
                questions: z.ZodArray<z.ZodUnknown>;
                skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                acceptance: z.ZodOptional<z.ZodUnknown>;
            }, z.core.$strict>;
        };
        cancellation: {
            parameter: "signal";
        };
        sourceLocation: {
            file: string;
            line: number;
            column: number;
        };
    })[];
};
export default TYPERT_REMOTE;
export declare const inject: string[];
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
export interface FlowRemote {
    list(signal?: AbortSignal): Promise<RemoteResult<{
        flows: FlowRecord[];
    }>>;
    get(request: {
        flowId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    create(request: {
        title: string;
        repoRoot: string;
        workspaceId?: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    advance(request: {
        flowId: string;
        expectedRevision: number;
        phase: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$6d617474536b696c6c73466c6f77 {
        list: (signal?: AbortSignal) => Promise<RemoteResult<{
            flows: FlowRecord[];
        }>>;
        get: (request: {
            flowId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        create: (request: {
            title: string;
            repoRoot: string;
            workspaceId?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        advance: (request: {
            flowId: string;
            expectedRevision: number;
            phase: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
    }
    interface TypertRemoteMap {
        'mattSkillsFlow/list': (signal?: AbortSignal) => Promise<RemoteResult<{
            flows: FlowRecord[];
        }>>;
        'mattSkillsFlow/get': (request: {
            flowId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/create': (request: {
            title: string;
            repoRoot: string;
            workspaceId?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/advance': (request: {
            flowId: string;
            expectedRevision: number;
            phase: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
    }
    interface TypertRemoteNamespaceMap {
        mattSkillsFlow: TypertRemoteNamespace$6d617474536b696c6c73466c6f77;
    }
}
