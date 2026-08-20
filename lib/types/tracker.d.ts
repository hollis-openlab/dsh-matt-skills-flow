import type { FlowRecord } from './domain.ts';
export interface LocalTrackerRecord {
    readonly kind: 'local';
    readonly root: string;
    readonly graphPath: string;
    readonly graphSha256: string;
    readonly publishedAt: number;
}
export declare class LocalTracker {
    publish(flow: Pick<FlowRecord, 'id' | 'title' | 'repoRoot' | 'tickets'>): Promise<LocalTrackerRecord>;
}
