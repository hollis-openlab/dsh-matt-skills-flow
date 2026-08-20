import type { Context } from '@deepseek-ai/cordis';
import { type FlowId, type FlowRecord } from './domain.ts';
export declare class FlowRepository {
    private readonly ctx;
    private domain;
    private table;
    constructor(ctx: Context);
    open(): Promise<void>;
    list(): FlowRecord[];
    get(id: FlowId): FlowRecord | undefined;
    create(flow: FlowRecord): Promise<FlowRecord>;
    update(id: FlowId, expectedRevision: number, apply: (flow: FlowRecord) => FlowRecord): Promise<FlowRecord>;
    private requireTable;
}
