export class FlowUiStore {
    remote;
    listeners = new Set();
    state = { open: false, busy: false, flows: [], showCreate: false };
    constructor(remote) {
        this.remote = remote;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    snapshot() { return this.state; }
    open() {
        this.state = { ...this.state, open: true, error: undefined };
        this.emit();
        void this.load();
    }
    close() {
        this.state = { ...this.state, open: false, showCreate: false };
        this.emit();
    }
    toggleCreate() {
        this.state = { ...this.state, showCreate: !this.state.showCreate, error: undefined };
        this.emit();
    }
    select(flowId) {
        this.state = { ...this.state, selected: flowId };
        this.emit();
    }
    async load() {
        this.state = { ...this.state, busy: true, error: undefined };
        this.emit();
        try {
            const result = await this.remote.list();
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            this.state = { ...this.state, busy: false, flows: [...result.value.flows], selected: this.state.selected ?? result.value.flows[0]?.id };
        }
        catch (error) {
            this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) };
        }
        this.emit();
    }
    async create(title, repoRoot) {
        this.state = { ...this.state, busy: true, error: undefined };
        this.emit();
        try {
            const result = await this.remote.create({ title, repoRoot });
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            this.state = { ...this.state, busy: false, showCreate: false, flows: [result.value, ...this.state.flows], selected: result.value.id };
        }
        catch (error) {
            this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) };
        }
        this.emit();
    }
    async advance(flow, phase) {
        this.state = { ...this.state, busy: true, error: undefined };
        this.emit();
        try {
            const result = await this.remote.advance({ flowId: flow.id, expectedRevision: flow.revision, phase });
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            this.state = { ...this.state, busy: false, flows: this.state.flows.map(item => item.id === flow.id ? result.value : item) };
        }
        catch (error) {
            this.state = { ...this.state, busy: false, error: error instanceof Error ? error.message : String(error) };
        }
        this.emit();
    }
    emit() { for (const listener of this.listeners)
        listener(); }
}
//# sourceMappingURL=store.js.map