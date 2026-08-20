import { z } from 'zod';
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace';
import type { ArtifactRecord } from './artifacts.ts';
export type FlowId = string & {
    readonly __flowId: unique symbol;
};
export declare const FlowId: (value: string) => FlowId;
export declare const FLOW_PHASES: readonly ["intake", "grilling", "wayfinding", "researching", "prototyping", "spec-review", "spec-ready", "ticketing", "tickets-ready", "execution-preflight", "running", "needs-human", "review-admission", "reviewing", "remediation", "ready-for-acceptance", "accepted", "paused", "failed", "aborted"];
export type FlowPhase = typeof FLOW_PHASES[number];
export declare const flowPhaseSchema: z.ZodEnum<{
    intake: "intake";
    grilling: "grilling";
    wayfinding: "wayfinding";
    researching: "researching";
    prototyping: "prototyping";
    "spec-review": "spec-review";
    "spec-ready": "spec-ready";
    ticketing: "ticketing";
    "tickets-ready": "tickets-ready";
    "execution-preflight": "execution-preflight";
    running: "running";
    "needs-human": "needs-human";
    "review-admission": "review-admission";
    reviewing: "reviewing";
    remediation: "remediation";
    "ready-for-acceptance": "ready-for-acceptance";
    accepted: "accepted";
    paused: "paused";
    failed: "failed";
    aborted: "aborted";
}>;
export declare const FLOW_ACTIONS: readonly ["start-feature", "start-large-effort", "start-bug", "start-research", "start-prototype", "propose-spec", "research-resolved", "prototype-resolved", "map-cleared-for-spec", "map-cleared-for-tickets", "approve-spec", "reject-spec", "begin-ticketing", "approve-graph", "reject-graph", "request-frontier", "approve-frontier", "reject-frontier", "question-created", "questions-answered", "frontier-drained", "admit-review", "reject-admission", "findings-require-fix", "closeout-ready", "candidate-refrozen", "accept", "reject", "pause", "resume", "fail", "recover", "abort"];
export type FlowAction = typeof FLOW_ACTIONS[number];
export declare const flowActionSchema: z.ZodEnum<{
    "start-feature": "start-feature";
    "start-large-effort": "start-large-effort";
    "start-bug": "start-bug";
    "start-research": "start-research";
    "start-prototype": "start-prototype";
    "propose-spec": "propose-spec";
    "research-resolved": "research-resolved";
    "prototype-resolved": "prototype-resolved";
    "map-cleared-for-spec": "map-cleared-for-spec";
    "map-cleared-for-tickets": "map-cleared-for-tickets";
    "approve-spec": "approve-spec";
    "reject-spec": "reject-spec";
    "begin-ticketing": "begin-ticketing";
    "approve-graph": "approve-graph";
    "reject-graph": "reject-graph";
    "request-frontier": "request-frontier";
    "approve-frontier": "approve-frontier";
    "reject-frontier": "reject-frontier";
    "question-created": "question-created";
    "questions-answered": "questions-answered";
    "frontier-drained": "frontier-drained";
    "admit-review": "admit-review";
    "reject-admission": "reject-admission";
    "findings-require-fix": "findings-require-fix";
    "closeout-ready": "closeout-ready";
    "candidate-refrozen": "candidate-refrozen";
    accept: "accept";
    reject: "reject";
    pause: "pause";
    resume: "resume";
    fail: "fail";
    recover: "recover";
    abort: "abort";
}>;
export interface FlowTransition {
    readonly action: FlowAction;
    readonly to: FlowPhase;
}
export interface FrontierPlan {
    readonly flowId: FlowId;
    readonly flowRevision: number;
    readonly tickets: readonly string[];
    readonly maxConcurrent: number;
    readonly maxDepth: number;
    readonly maxTotalAgents: number;
    readonly warnings: readonly string[];
}
export interface ReviewFinding {
    readonly id: string;
    readonly axis: 'standards' | 'spec';
    readonly severity: 'blocking' | 'warning' | 'note';
    readonly title: string;
    readonly explanation: string;
    readonly disposition?: {
        readonly kind: 'fixed' | 'rejected' | 'deferred';
        readonly reason: string;
    };
}
export declare function frontierFor(flow: Pick<FlowRecord, 'id' | 'revision' | 'tickets' | 'lanes'>, maxConcurrent: number): FrontierPlan;
export type GateResult = {
    readonly kind: 'pass';
    readonly evidence: readonly string[];
} | {
    readonly kind: 'needs-user';
    readonly gate: string;
    readonly message: string;
} | {
    readonly kind: 'blocked';
    readonly code: string;
    readonly message: string;
    readonly evidence: readonly string[];
};
export declare function evaluateTransitionGate(flow: Pick<FlowRecord, 'phase' | 'skillSnapshot' | 'decisions' | 'tickets' | 'acceptance' | 'review'>, action: FlowAction): GateResult;
export declare function transitionsFor(phase: FlowPhase): readonly FlowAction[];
export declare function transitionFor(flow: Pick<FlowRecord, 'phase' | 'pausedFrom' | 'planningReturnPhase'>, action: FlowAction): FlowTransition | undefined;
export declare function defaultTransitionFor(flow: Pick<FlowRecord, 'phase' | 'pausedFrom' | 'planningReturnPhase'>): FlowTransition | undefined;
export interface DecisionRecord {
    readonly id: string;
    readonly question: string;
    readonly answer: string;
    readonly status: 'active' | 'superseded';
    readonly createdAt: number;
    readonly supersededBy?: string;
}
export interface TicketRecord {
    readonly id: string;
    readonly title: string;
    readonly status: 'open' | 'blocked' | 'running' | 'completed' | 'failed' | 'integrated';
    readonly blockedBy: readonly string[];
    readonly dependsOn: readonly string[];
    readonly acceptanceCriteria?: readonly string[];
    readonly workflowRole?: string;
}
export interface LaneRecord {
    readonly id: string;
    readonly ticketId: string;
    readonly status: 'preparing' | 'ready' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'integrating' | 'integrated';
    readonly branch?: string;
    readonly worktreePath?: string;
    readonly baseCommit?: string;
    readonly packetArtifactId?: string;
    readonly packetSha256?: string;
    readonly commit?: string;
    readonly resultArtifactId?: string;
    readonly resultSha256?: string;
    readonly resultSummary?: string;
    readonly cleanedAt?: number;
    readonly updatedAt: number;
}
export interface QuestionRecord {
    readonly id: string;
    readonly ticketId?: string;
    readonly question: string;
    readonly status: 'pending' | 'answered' | 'dismissed';
    readonly createdAt: number;
    readonly answer?: string;
}
export type ActivityKind = 'research' | 'prototype' | 'wayfinder';
export interface ActivityRecord {
    readonly id: string;
    readonly kind: ActivityKind;
    readonly question: string;
    readonly expectedEvidence?: string;
    readonly status: 'open' | 'completed' | 'cancelled';
    readonly output?: string;
    readonly sourceRef?: string;
    readonly handoff?: 'to-grilling' | 'to-spec' | 'to-tickets';
    readonly createdAt: number;
    readonly completedAt?: number;
}
export interface FlowRecord {
    readonly schemaVersion: 1;
    readonly id: FlowId;
    readonly revision: number;
    readonly title: string;
    readonly workspaceId?: WorkspaceId;
    readonly repoRoot: string;
    readonly rootSessionId?: string;
    readonly phase: FlowPhase;
    readonly pausedFrom?: FlowPhase;
    readonly planningReturnPhase?: 'intake' | 'grilling' | 'wayfinding';
    readonly nextAction: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly decisions: readonly DecisionRecord[];
    readonly tickets: readonly TicketRecord[];
    readonly lanes: readonly LaneRecord[];
    readonly questions: readonly QuestionRecord[];
    readonly activities?: readonly ActivityRecord[];
    readonly artifacts: readonly ArtifactRecord[];
    readonly tracker?: {
        readonly kind: 'local';
        readonly root: string;
        readonly graphPath: string;
        readonly graphSha256: string;
        readonly publishedAt: number;
    };
    readonly integration?: {
        readonly branch: string;
        readonly worktreePath: string;
        readonly baseCommit: string;
        readonly headCommit: string;
    };
    readonly spec?: {
        readonly status: 'draft' | 'approved' | 'stale';
        readonly artifactId: string;
        readonly sha256: string;
        readonly createdAt: number;
        readonly approvedAt?: number;
    };
    readonly export?: {
        readonly artifactId: string;
        readonly sha256: string;
        readonly createdAt: number;
    };
    readonly review?: {
        readonly candidateArtifactId: string;
        readonly candidateSha256: string;
        readonly fixedPoint: string;
        readonly createdAt: number;
        readonly status?: 'frozen' | 'running' | 'complete' | 'failed';
        readonly findings?: readonly ReviewFinding[];
    };
    readonly recovery?: {
        readonly status: 'clean' | 'required' | 'reconciled';
        readonly reason?: string;
        readonly observedAt: number;
    };
    readonly skillSnapshot?: {
        readonly status: 'missing' | 'ready' | 'unknown';
        readonly count: number;
        readonly names?: readonly string[];
        readonly missing?: readonly string[];
        readonly entries?: readonly SkillSnapshotEntry[];
        readonly aggregateSha256?: string;
    };
    readonly acceptance?: {
        readonly status: 'not-ready' | 'ready' | 'accepted' | 'rejected';
        readonly candidateCommit?: string;
        readonly receiptArtifactId?: string;
        readonly acceptedAt?: number;
        readonly acceptedBy?: 'local-user';
    };
}
export interface SkillSnapshotEntry {
    readonly name: string;
    readonly provider: string;
    readonly source: string;
    readonly invocation: {
        readonly modelInvocable: boolean;
        readonly userInvocable: boolean;
    };
    readonly contentSha256: string;
}
/** Validate dependency edges and reject unknown nodes or cycles before publication. */
export declare function validateTicketGraph(tickets: readonly Pick<TicketRecord, 'id' | 'dependsOn'>[]): void;
export declare const flowRecordSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    revision: z.ZodNumber;
    title: z.ZodString;
    workspaceId: z.ZodOptional<z.ZodString>;
    repoRoot: z.ZodString;
    rootSessionId: z.ZodOptional<z.ZodString>;
    phase: z.ZodEnum<{
        intake: "intake";
        grilling: "grilling";
        wayfinding: "wayfinding";
        researching: "researching";
        prototyping: "prototyping";
        "spec-review": "spec-review";
        "spec-ready": "spec-ready";
        ticketing: "ticketing";
        "tickets-ready": "tickets-ready";
        "execution-preflight": "execution-preflight";
        running: "running";
        "needs-human": "needs-human";
        "review-admission": "review-admission";
        reviewing: "reviewing";
        remediation: "remediation";
        "ready-for-acceptance": "ready-for-acceptance";
        accepted: "accepted";
        paused: "paused";
        failed: "failed";
        aborted: "aborted";
    }>;
    pausedFrom: z.ZodOptional<z.ZodEnum<{
        intake: "intake";
        grilling: "grilling";
        wayfinding: "wayfinding";
        researching: "researching";
        prototyping: "prototyping";
        "spec-review": "spec-review";
        "spec-ready": "spec-ready";
        ticketing: "ticketing";
        "tickets-ready": "tickets-ready";
        "execution-preflight": "execution-preflight";
        running: "running";
        "needs-human": "needs-human";
        "review-admission": "review-admission";
        reviewing: "reviewing";
        remediation: "remediation";
        "ready-for-acceptance": "ready-for-acceptance";
        accepted: "accepted";
        paused: "paused";
        failed: "failed";
        aborted: "aborted";
    }>>;
    planningReturnPhase: z.ZodOptional<z.ZodEnum<{
        intake: "intake";
        grilling: "grilling";
        wayfinding: "wayfinding";
    }>>;
    nextAction: z.ZodString;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    decisions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            superseded: "superseded";
        }>;
        createdAt: z.ZodNumber;
        supersededBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    tickets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        status: z.ZodEnum<{
            running: "running";
            failed: "failed";
            completed: "completed";
            integrated: "integrated";
            blocked: "blocked";
            open: "open";
        }>;
        blockedBy: z.ZodArray<z.ZodString>;
        dependsOn: z.ZodArray<z.ZodString>;
        acceptanceCriteria: z.ZodOptional<z.ZodArray<z.ZodString>>;
        workflowRole: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    lanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        ticketId: z.ZodString;
        status: z.ZodEnum<{
            running: "running";
            failed: "failed";
            completed: "completed";
            integrated: "integrated";
            blocked: "blocked";
            integrating: "integrating";
            preparing: "preparing";
            ready: "ready";
            cancelled: "cancelled";
        }>;
        branch: z.ZodOptional<z.ZodString>;
        worktreePath: z.ZodOptional<z.ZodString>;
        baseCommit: z.ZodOptional<z.ZodString>;
        packetArtifactId: z.ZodOptional<z.ZodString>;
        packetSha256: z.ZodOptional<z.ZodString>;
        commit: z.ZodOptional<z.ZodString>;
        resultArtifactId: z.ZodOptional<z.ZodString>;
        resultSha256: z.ZodOptional<z.ZodString>;
        resultSummary: z.ZodOptional<z.ZodString>;
        cleanedAt: z.ZodOptional<z.ZodNumber>;
        updatedAt: z.ZodNumber;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        ticketId: z.ZodOptional<z.ZodString>;
        question: z.ZodString;
        status: z.ZodEnum<{
            pending: "pending";
            answered: "answered";
            dismissed: "dismissed";
        }>;
        createdAt: z.ZodNumber;
        answer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    activities: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            research: "research";
            prototype: "prototype";
            wayfinder: "wayfinder";
        }>;
        question: z.ZodString;
        expectedEvidence: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<{
            completed: "completed";
            cancelled: "cancelled";
            open: "open";
        }>;
        output: z.ZodOptional<z.ZodString>;
        sourceRef: z.ZodOptional<z.ZodString>;
        handoff: z.ZodOptional<z.ZodEnum<{
            "to-grilling": "to-grilling";
            "to-spec": "to-spec";
            "to-tickets": "to-tickets";
        }>>;
        createdAt: z.ZodNumber;
        completedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>>;
    artifacts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            decision: "decision";
            ticket: "ticket";
            lane: "lane";
            packet: "packet";
            review: "review";
            spec: "spec";
            export: "export";
            acceptance: "acceptance";
        }>;
        mediaType: z.ZodString;
        sha256: z.ZodString;
        size: z.ZodNumber;
        relativePath: z.ZodString;
        createdAt: z.ZodNumber;
    }, z.core.$strict>>>;
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
    skillSnapshot: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            ready: "ready";
            missing: "missing";
            unknown: "unknown";
        }>;
        count: z.ZodNumber;
        names: z.ZodOptional<z.ZodArray<z.ZodString>>;
        missing: z.ZodOptional<z.ZodArray<z.ZodString>>;
        entries: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodString;
            source: z.ZodString;
            invocation: z.ZodObject<{
                modelInvocable: z.ZodBoolean;
                userInvocable: z.ZodBoolean;
            }, z.core.$strict>;
            contentSha256: z.ZodString;
        }, z.core.$strict>>>;
        aggregateSha256: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    review: z.ZodOptional<z.ZodObject<{
        candidateArtifactId: z.ZodString;
        candidateSha256: z.ZodString;
        fixedPoint: z.ZodString;
        createdAt: z.ZodNumber;
        status: z.ZodOptional<z.ZodEnum<{
            running: "running";
            failed: "failed";
            frozen: "frozen";
            complete: "complete";
        }>>;
        findings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            axis: z.ZodEnum<{
                spec: "spec";
                standards: "standards";
            }>;
            severity: z.ZodEnum<{
                blocking: "blocking";
                warning: "warning";
                note: "note";
            }>;
            title: z.ZodString;
            explanation: z.ZodString;
            disposition: z.ZodOptional<z.ZodObject<{
                kind: z.ZodEnum<{
                    fixed: "fixed";
                    rejected: "rejected";
                    deferred: "deferred";
                }>;
                reason: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    spec: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            draft: "draft";
            approved: "approved";
            stale: "stale";
        }>;
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
    recovery: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            clean: "clean";
            required: "required";
            reconciled: "reconciled";
        }>;
        reason: z.ZodOptional<z.ZodString>;
        observedAt: z.ZodNumber;
    }, z.core.$strict>>;
    acceptance: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            accepted: "accepted";
            rejected: "rejected";
            ready: "ready";
            "not-ready": "not-ready";
        }>;
        candidateCommit: z.ZodOptional<z.ZodString>;
        receiptArtifactId: z.ZodOptional<z.ZodString>;
        acceptedAt: z.ZodOptional<z.ZodNumber>;
        acceptedBy: z.ZodOptional<z.ZodLiteral<"local-user">>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const mattSkillsFlowDomain: {
    name: string;
    version: number;
    tables: {
        flows: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<FlowId, FlowRecord>;
    };
};
export declare function nextActionFor(phase: FlowPhase): string;
export declare function nextPhaseFor(phase: FlowPhase): FlowPhase | undefined;
export declare function createFlowRecord(input: {
    id: FlowId;
    title: string;
    repoRoot: string;
    rootSessionId?: string;
    workspaceId?: WorkspaceId;
    now: number;
}): FlowRecord;
