import { mattSkillsFlowDomain } from './domain.ts';
export class FlowRepository {
    ctx;
    domain;
    table;
    constructor(ctx) {
        this.ctx = ctx;
    }
    async open() {
        this.domain = await this.ctx.storageDomain.open(mattSkillsFlowDomain);
        this.table = this.domain.table('flows');
        this.ctx.effect(() => () => { void this.domain?.close(); }, 'matt-skills-flow: storage close');
    }
    list() {
        return [...this.requireTable().entries()].map(([, flow]) => flow)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    get(id) {
        return this.requireTable().get(id);
    }
    async create(flow) {
        const table = this.requireTable();
        if (table.get(flow.id) !== undefined)
            throw new Error(`flow '${flow.id}' already exists`);
        await table.put(flow.id, flow);
        return flow;
    }
    async update(id, expectedRevision, apply) {
        const table = this.requireTable();
        return await table.update(id, current => {
            if (current.revision !== expectedRevision) {
                throw new Error(`FLOW_STALE_REVISION: expected ${expectedRevision}, current ${current.revision}`);
            }
            const next = apply(current);
            if (next.id !== current.id || next.revision !== current.revision + 1) {
                throw new Error(`invalid flow revision transition for '${id}'`);
            }
            return next;
        });
    }
    requireTable() {
        if (this.table === undefined)
            throw new Error('matt-skills-flow storage is not ready');
        return this.table;
    }
}
//# sourceMappingURL=storage.js.map