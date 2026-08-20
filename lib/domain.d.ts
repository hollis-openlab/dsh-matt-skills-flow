import { z } from 'zod';
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace';
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
}
export interface LaneRecord {
    readonly id: string;
    readonly ticketId: string;
    readonly status: 'preparing' | 'ready' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'integrated';
    readonly branch?: string;
    readonly worktreePath?: string;
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
export interface FlowRecord {
    readonly schemaVersion: 1;
    readonly id: FlowId;
    readonly revision: number;
    readonly title: string;
    readonly workspaceId?: WorkspaceId;
    readonly repoRoot: string;
    readonly phase: FlowPhase;
    readonly nextAction: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly decisions: readonly DecisionRecord[];
    readonly tickets: readonly TicketRecord[];
    readonly lanes: readonly LaneRecord[];
    readonly questions: readonly QuestionRecord[];
    readonly skillSnapshot?: {
        readonly status: 'missing' | 'ready' | 'unknown';
        readonly count: number;
        readonly aggregateSha256?: string;
    };
    readonly acceptance?: {
        readonly status: 'not-ready' | 'ready' | 'accepted' | 'rejected';
        readonly candidateCommit?: string;
    };
}
export declare const flowRecordSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    revision: z.ZodNumber;
    title: z.ZodString;
    workspaceId: z.ZodOptional<z.ZodString>;
    repoRoot: z.ZodString;
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
            open: "open";
            blocked: "blocked";
            completed: "completed";
            integrated: "integrated";
        }>;
        blockedBy: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    lanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        ticketId: z.ZodString;
        status: z.ZodEnum<{
            running: "running";
            failed: "failed";
            blocked: "blocked";
            completed: "completed";
            integrated: "integrated";
            preparing: "preparing";
            ready: "ready";
            cancelled: "cancelled";
        }>;
        branch: z.ZodOptional<z.ZodString>;
        worktreePath: z.ZodOptional<z.ZodString>;
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
    skillSnapshot: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            ready: "ready";
            missing: "missing";
            unknown: "unknown";
        }>;
        count: z.ZodNumber;
        aggregateSha256: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    acceptance: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<{
            accepted: "accepted";
            ready: "ready";
            "not-ready": "not-ready";
            rejected: "rejected";
        }>;
        candidateCommit: z.ZodOptional<z.ZodString>;
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
export declare function createFlowRecord(input: {
    id: FlowId;
    title: string;
    repoRoot: string;
    workspaceId?: WorkspaceId;
    now: number;
}): FlowRecord;
