import type { FlowRecord } from '../domain.ts';
import type { FlowRemote } from '../remote.ts';
export interface FlowUiState {
    readonly open: boolean;
    readonly busy: boolean;
    readonly error?: string;
    readonly flows: readonly FlowRecord[];
    readonly selected?: string;
    readonly showCreate: boolean;
}
export declare class FlowUiStore {
    private readonly remote;
    private listeners;
    private state;
    constructor(remote: FlowRemote);
    subscribe(listener: () => void): () => void;
    snapshot(): FlowUiState;
    open(): void;
    close(): void;
    toggleCreate(): void;
    select(flowId: string): void;
    load(): Promise<void>;
    create(title: string, repoRoot: string): Promise<void>;
    advance(flow: FlowRecord, phase: string): Promise<void>;
    private emit;
}
