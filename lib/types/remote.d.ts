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
    action: z.ZodString;
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
                    rootSessionId: z.ZodOptional<z.ZodString>;
                    phase: z.ZodString;
                    pausedFrom: z.ZodOptional<z.ZodString>;
                    planningReturnPhase: z.ZodOptional<z.ZodString>;
                    nextAction: z.ZodString;
                    createdAt: z.ZodNumber;
                    updatedAt: z.ZodNumber;
                    decisions: z.ZodArray<z.ZodUnknown>;
                    tickets: z.ZodArray<z.ZodUnknown>;
                    lanes: z.ZodArray<z.ZodUnknown>;
                    questions: z.ZodArray<z.ZodUnknown>;
                    artifacts: z.ZodDefault<z.ZodArray<z.ZodUnknown>>;
                    skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                    acceptance: z.ZodOptional<z.ZodUnknown>;
                    tracker: z.ZodOptional<z.ZodObject<{
                        kind: z.ZodLiteral<"local">;
                        root: z.ZodString;
                        graphPath: z.ZodString;
                        graphSha256: z.ZodString;
                        publishedAt: z.ZodNumber;
                    }, z.core.$strict>>;
                    integration: z.ZodOptional<z.ZodObject<{
                        branch: z.ZodString;
                        worktreePath: z.ZodString;
                        baseCommit: z.ZodString;
                        headCommit: z.ZodString;
                    }, z.core.$strict>>;
                    review: z.ZodOptional<z.ZodObject<{
                        candidateArtifactId: z.ZodString;
                        candidateSha256: z.ZodString;
                        fixedPoint: z.ZodString;
                        createdAt: z.ZodNumber;
                        status: z.ZodOptional<z.ZodString>;
                        findings: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
                    }, z.core.$strict>>;
                    recovery: z.ZodOptional<z.ZodObject<{
                        status: z.ZodString;
                        reason: z.ZodOptional<z.ZodString>;
                        observedAt: z.ZodNumber;
                    }, z.core.$strict>>;
                    spec: z.ZodOptional<z.ZodObject<{
                        status: z.ZodString;
                        artifactId: z.ZodString;
                        sha256: z.ZodString;
                        createdAt: z.ZodNumber;
                        approvedAt: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    export: z.ZodOptional<z.ZodObject<{
                        artifactId: z.ZodString;
                        sha256: z.ZodString;
                        createdAt: z.ZodNumber;
                    }, z.core.$strict>>;
                }, z.core.$loose>>;
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
                rootSessionId: z.ZodOptional<z.ZodString>;
                phase: z.ZodString;
                pausedFrom: z.ZodOptional<z.ZodString>;
                planningReturnPhase: z.ZodOptional<z.ZodString>;
                nextAction: z.ZodString;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
                decisions: z.ZodArray<z.ZodUnknown>;
                tickets: z.ZodArray<z.ZodUnknown>;
                lanes: z.ZodArray<z.ZodUnknown>;
                questions: z.ZodArray<z.ZodUnknown>;
                artifacts: z.ZodDefault<z.ZodArray<z.ZodUnknown>>;
                skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                acceptance: z.ZodOptional<z.ZodUnknown>;
                tracker: z.ZodOptional<z.ZodObject<{
                    kind: z.ZodLiteral<"local">;
                    root: z.ZodString;
                    graphPath: z.ZodString;
                    graphSha256: z.ZodString;
                    publishedAt: z.ZodNumber;
                }, z.core.$strict>>;
                integration: z.ZodOptional<z.ZodObject<{
                    branch: z.ZodString;
                    worktreePath: z.ZodString;
                    baseCommit: z.ZodString;
                    headCommit: z.ZodString;
                }, z.core.$strict>>;
                review: z.ZodOptional<z.ZodObject<{
                    candidateArtifactId: z.ZodString;
                    candidateSha256: z.ZodString;
                    fixedPoint: z.ZodString;
                    createdAt: z.ZodNumber;
                    status: z.ZodOptional<z.ZodString>;
                    findings: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
                }, z.core.$strict>>;
                recovery: z.ZodOptional<z.ZodObject<{
                    status: z.ZodString;
                    reason: z.ZodOptional<z.ZodString>;
                    observedAt: z.ZodNumber;
                }, z.core.$strict>>;
                spec: z.ZodOptional<z.ZodObject<{
                    status: z.ZodString;
                    artifactId: z.ZodString;
                    sha256: z.ZodString;
                    createdAt: z.ZodNumber;
                    approvedAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                export: z.ZodOptional<z.ZodObject<{
                    artifactId: z.ZodString;
                    sha256: z.ZodString;
                    createdAt: z.ZodNumber;
                }, z.core.$strict>>;
            }, z.core.$loose>;
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
                rootSessionId: z.ZodOptional<z.ZodString>;
                phase: z.ZodString;
                pausedFrom: z.ZodOptional<z.ZodString>;
                planningReturnPhase: z.ZodOptional<z.ZodString>;
                nextAction: z.ZodString;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
                decisions: z.ZodArray<z.ZodUnknown>;
                tickets: z.ZodArray<z.ZodUnknown>;
                lanes: z.ZodArray<z.ZodUnknown>;
                questions: z.ZodArray<z.ZodUnknown>;
                artifacts: z.ZodDefault<z.ZodArray<z.ZodUnknown>>;
                skillSnapshot: z.ZodOptional<z.ZodUnknown>;
                acceptance: z.ZodOptional<z.ZodUnknown>;
                tracker: z.ZodOptional<z.ZodObject<{
                    kind: z.ZodLiteral<"local">;
                    root: z.ZodString;
                    graphPath: z.ZodString;
                    graphSha256: z.ZodString;
                    publishedAt: z.ZodNumber;
                }, z.core.$strict>>;
                integration: z.ZodOptional<z.ZodObject<{
                    branch: z.ZodString;
                    worktreePath: z.ZodString;
                    baseCommit: z.ZodString;
                    headCommit: z.ZodString;
                }, z.core.$strict>>;
                review: z.ZodOptional<z.ZodObject<{
                    candidateArtifactId: z.ZodString;
                    candidateSha256: z.ZodString;
                    fixedPoint: z.ZodString;
                    createdAt: z.ZodNumber;
                    status: z.ZodOptional<z.ZodString>;
                    findings: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
                }, z.core.$strict>>;
                recovery: z.ZodOptional<z.ZodObject<{
                    status: z.ZodString;
                    reason: z.ZodOptional<z.ZodString>;
                    observedAt: z.ZodNumber;
                }, z.core.$strict>>;
                spec: z.ZodOptional<z.ZodObject<{
                    status: z.ZodString;
                    artifactId: z.ZodString;
                    sha256: z.ZodString;
                    createdAt: z.ZodNumber;
                    approvedAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                export: z.ZodOptional<z.ZodObject<{
                    artifactId: z.ZodString;
                    sha256: z.ZodString;
                    createdAt: z.ZodNumber;
                }, z.core.$strict>>;
            }, z.core.$loose>;
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
                flowId: z.ZodString;
                flowRevision: z.ZodNumber;
                tickets: z.ZodArray<z.ZodString>;
                maxConcurrent: z.ZodNumber;
                maxDepth: z.ZodNumber;
                maxTotalAgents: z.ZodNumber;
                warnings: z.ZodArray<z.ZodString>;
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
        action: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    decide(request: {
        flowId: string;
        expectedRevision: number;
        question: string;
        answer: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    ticket(request: {
        flowId: string;
        expectedRevision: number;
        title: string;
        dependsOn?: string[];
        acceptanceCriteria?: string[];
        workflowRole?: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    updateTicket(request: {
        flowId: string;
        expectedRevision: number;
        ticketId: string;
        title: string;
        dependsOn?: string[];
        acceptanceCriteria?: string[];
        workflowRole?: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    startActivity(request: {
        flowId: string;
        expectedRevision: number;
        kind: 'research' | 'prototype' | 'wayfinder';
        question: string;
        expectedEvidence?: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    completeActivity(request: {
        flowId: string;
        expectedRevision: number;
        activityId: string;
        output: string;
        sourceRef: string;
        handoff?: 'to-grilling' | 'to-spec' | 'to-tickets';
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    lane(request: {
        flowId: string;
        expectedRevision: number;
        ticketId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    publish(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    provisionLane(request: {
        flowId: string;
        expectedRevision: number;
        laneId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    runLane(request: {
        flowId: string;
        expectedRevision: number;
        laneId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    prepareAcceptance(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    accept(request: {
        flowId: string;
        expectedRevision: number;
        candidateArtifactId: string;
        accept: true;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    cleanup(request: {
        flowId: string;
        expectedRevision: number;
        laneId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    integrate(request: {
        flowId: string;
        expectedRevision: number;
        laneId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    answerQuestion(request: {
        flowId: string;
        expectedRevision: number;
        questionId: string;
        answer: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    resume(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    previewFrontier(request: {
        flowId: string;
    }, signal?: AbortSignal): Promise<RemoteResult<import('./domain.ts').FrontierPlan>>;
    startFrontier(request: {
        flowId: string;
        expectedRevision: number;
        maxConcurrent?: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    requestReview(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    disposeFinding(request: {
        flowId: string;
        expectedRevision: number;
        findingId: string;
        kind: 'fixed' | 'rejected' | 'deferred';
        reason: string;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    generateSpec(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    approveSpec(request: {
        flowId: string;
        expectedRevision: number;
    }, signal?: AbortSignal): Promise<RemoteResult<FlowRecord>>;
    exportEvidence(request: {
        flowId: string;
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
            action: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        decide: (request: {
            flowId: string;
            expectedRevision: number;
            question: string;
            answer: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        ticket: (request: {
            flowId: string;
            expectedRevision: number;
            title: string;
            dependsOn?: string[];
            acceptanceCriteria?: string[];
            workflowRole?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        updateTicket: (request: {
            flowId: string;
            expectedRevision: number;
            ticketId: string;
            title: string;
            dependsOn?: string[];
            acceptanceCriteria?: string[];
            workflowRole?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        startActivity: (request: {
            flowId: string;
            expectedRevision: number;
            kind: 'research' | 'prototype' | 'wayfinder';
            question: string;
            expectedEvidence?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        completeActivity: (request: {
            flowId: string;
            expectedRevision: number;
            activityId: string;
            output: string;
            sourceRef: string;
            handoff?: 'to-grilling' | 'to-spec' | 'to-tickets';
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        lane: (request: {
            flowId: string;
            expectedRevision: number;
            ticketId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        publish: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        provisionLane: (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        runLane: (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        prepareAcceptance: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        accept: (request: {
            flowId: string;
            expectedRevision: number;
            candidateArtifactId: string;
            accept: true;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        cleanup: (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        integrate: (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        answerQuestion: (request: {
            flowId: string;
            expectedRevision: number;
            questionId: string;
            answer: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        resume: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        previewFrontier: (request: {
            flowId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<import('./domain.ts').FrontierPlan>>;
        startFrontier: (request: {
            flowId: string;
            expectedRevision: number;
            maxConcurrent?: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        requestReview: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        disposeFinding: (request: {
            flowId: string;
            expectedRevision: number;
            findingId: string;
            kind: 'fixed' | 'rejected' | 'deferred';
            reason: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        generateSpec: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        approveSpec: (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        exportEvidence: (request: {
            flowId: string;
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
            action: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/decide': (request: {
            flowId: string;
            expectedRevision: number;
            question: string;
            answer: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/ticket': (request: {
            flowId: string;
            expectedRevision: number;
            title: string;
            dependsOn?: string[];
            acceptanceCriteria?: string[];
            workflowRole?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/updateTicket': (request: {
            flowId: string;
            expectedRevision: number;
            ticketId: string;
            title: string;
            dependsOn?: string[];
            acceptanceCriteria?: string[];
            workflowRole?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/startActivity': (request: {
            flowId: string;
            expectedRevision: number;
            kind: 'research' | 'prototype' | 'wayfinder';
            question: string;
            expectedEvidence?: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/completeActivity': (request: {
            flowId: string;
            expectedRevision: number;
            activityId: string;
            output: string;
            sourceRef: string;
            handoff?: 'to-grilling' | 'to-spec' | 'to-tickets';
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/lane': (request: {
            flowId: string;
            expectedRevision: number;
            ticketId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/publish': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/provisionLane': (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/runLane': (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/prepareAcceptance': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/accept': (request: {
            flowId: string;
            expectedRevision: number;
            candidateArtifactId: string;
            accept: true;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/cleanup': (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/integrate': (request: {
            flowId: string;
            expectedRevision: number;
            laneId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/answerQuestion': (request: {
            flowId: string;
            expectedRevision: number;
            questionId: string;
            answer: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/resume': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/previewFrontier': (request: {
            flowId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<import('./domain.ts').FrontierPlan>>;
        'mattSkillsFlow/startFrontier': (request: {
            flowId: string;
            expectedRevision: number;
            maxConcurrent?: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/requestReview': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/disposeFinding': (request: {
            flowId: string;
            expectedRevision: number;
            findingId: string;
            kind: 'fixed' | 'rejected' | 'deferred';
            reason: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/generateSpec': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/approveSpec': (request: {
            flowId: string;
            expectedRevision: number;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
        'mattSkillsFlow/exportEvidence': (request: {
            flowId: string;
        }, signal?: AbortSignal) => Promise<RemoteResult<FlowRecord>>;
    }
    interface TypertRemoteNamespaceMap {
        mattSkillsFlow: TypertRemoteNamespace$6d617474536b696c6c73466c6f77;
    }
}
