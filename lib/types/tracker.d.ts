import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import type { FlowRecord } from './domain.ts';
export type TrackerFlow = Pick<FlowRecord, 'id' | 'title' | 'repoRoot' | 'tickets'>;
export interface LocalTrackerRecord {
    readonly kind: 'local';
    readonly root: string;
    readonly graphPath: string;
    readonly graphSha256: string;
    readonly publishedAt: number;
}
export interface GitHubTrackerRecord {
    readonly kind: 'github';
    readonly repository: string;
    readonly graphPath: string;
    readonly graphSha256: string;
    readonly issueNumbers: readonly number[];
    readonly issueUrls: readonly string[];
    readonly publishedAt: number;
}
export type TrackerRecord = LocalTrackerRecord | GitHubTrackerRecord;
export interface TrackerSnapshot {
    readonly kind: TrackerRecord['kind'];
    readonly graphSha256: string;
    readonly drift: readonly string[];
    readonly statuses: Readonly<Record<string, string>>;
}
export interface TrackerRef {
    readonly kind: TrackerRecord['kind'];
    readonly key: string;
    readonly url?: string;
}
export interface TrackerArtifact {
    readonly ref: TrackerRef;
    readonly title: string;
    readonly body: string;
    readonly sha256: string;
}
export interface TrackerAdapter {
    publish(flow: TrackerFlow, signal?: AbortSignal): Promise<TrackerRecord>;
    inspect(flow: TrackerFlow, publication: TrackerRecord, signal?: AbortSignal): Promise<TrackerSnapshot>;
    publishSpec(flow: TrackerFlow, title: string, body: string, signal?: AbortSignal): Promise<TrackerRef>;
    readSpec(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>;
    publishTickets(flow: TrackerFlow, signal?: AbortSignal): Promise<readonly TrackerRef[]>;
    readTicket(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>;
    readStatuses(flow: TrackerFlow, publication: TrackerRecord, signal?: AbortSignal): Promise<Readonly<Record<string, string>>>;
    appendComment(flow: TrackerFlow, publication: TrackerRecord, ticketId: string, body: string, signal?: AbortSignal): Promise<TrackerRef>;
}
export declare class LocalTracker implements TrackerAdapter {
    publish(flow: TrackerFlow): Promise<LocalTrackerRecord>;
    inspect(flow: TrackerFlow, publication: LocalTrackerRecord): Promise<TrackerSnapshot>;
    publishSpec(flow: TrackerFlow, title: string, body: string): Promise<TrackerRef>;
    readSpec(flow: TrackerFlow, ref: TrackerRef): Promise<TrackerArtifact>;
    publishTickets(flow: TrackerFlow): Promise<readonly TrackerRef[]>;
    readTicket(flow: TrackerFlow, ref: TrackerRef): Promise<TrackerArtifact>;
    readStatuses(flow: TrackerFlow, _publication: LocalTrackerRecord): Promise<Readonly<Record<string, string>>>;
    appendComment(flow: TrackerFlow, publication: LocalTrackerRecord, ticketId: string, body: string): Promise<TrackerRef>;
}
/** Publish a Ticket Graph as GitHub Issues without granting the tracker broader write authority. */
export declare class GitHubTracker implements TrackerAdapter {
    private readonly subprocess;
    private readonly configuredRepository?;
    private readonly ghExecutable;
    private readonly gitExecutable;
    constructor(subprocess: SubprocessRuntime, configuredRepository?: string | undefined);
    publish(flow: TrackerFlow, signal?: AbortSignal): Promise<GitHubTrackerRecord>;
    inspect(flow: TrackerFlow, publication: GitHubTrackerRecord, signal?: AbortSignal): Promise<TrackerSnapshot>;
    publishSpec(flow: TrackerFlow, title: string, body: string, signal?: AbortSignal): Promise<TrackerRef>;
    readSpec(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>;
    publishTickets(flow: TrackerFlow, signal?: AbortSignal): Promise<readonly TrackerRef[]>;
    readTicket(flow: TrackerFlow, ref: TrackerRef, signal?: AbortSignal): Promise<TrackerArtifact>;
    readStatuses(flow: TrackerFlow, publication: GitHubTrackerRecord, signal?: AbortSignal): Promise<Readonly<Record<string, string>>>;
    appendComment(flow: TrackerFlow, publication: GitHubTrackerRecord, ticketId: string, body: string, signal?: AbortSignal): Promise<TrackerRef>;
    private resolveRepository;
    private runJson;
    private run;
}
