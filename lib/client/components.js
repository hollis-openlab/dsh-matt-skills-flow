import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useSyncExternalStore } from 'react';
import { FlowUiStore } from './store.ts';
const phaseKeys = ['intake', 'grilling', 'spec-review', 'spec-ready', 'ticketing', 'tickets-ready', 'running', 'needs-human', 'reviewing', 'remediation', 'ready-for-acceptance', 'accepted', 'paused', 'aborted'];
function useStore(store) {
    return useSyncExternalStore(listener => store.subscribe(listener), () => store.snapshot(), () => store.snapshot());
}
export function MattFlowLauncher({ wide = true, store, t }) {
    return (_jsxs("button", { className: "matt-flow-launcher", type: "button", title: t('open'), onClick: () => store.open(), children: [_jsx("span", { className: "matt-flow-launcher-mark", "aria-hidden": "true", children: "M" }), wide ? _jsx("span", { children: t('nav') }) : null] }));
}
export function MattFlowShell({ store, t }) {
    const state = useStore(store);
    if (!state.open)
        return null;
    const selected = state.flows.find(flow => flow.id === state.selected);
    return (_jsx("div", { className: "matt-flow-overlay", role: "dialog", "aria-modal": "true", "aria-label": t('title'), children: _jsxs("div", { className: "matt-flow-shell", children: [_jsxs("header", { className: "matt-flow-header", children: [_jsxs("div", { children: [_jsx("p", { className: "matt-flow-eyebrow", children: "Matt Skills" }), _jsx("h1", { children: t('title') }), _jsx("p", { children: t('subtitle') })] }), _jsxs("div", { className: "matt-flow-header-actions", children: [_jsx("button", { type: "button", onClick: () => void store.load(), disabled: state.busy, children: t('refresh') }), _jsx("button", { type: "button", onClick: () => store.close(), children: t('close') })] })] }), _jsxs("main", { className: "matt-flow-main", children: [_jsxs("aside", { className: "matt-flow-list", "aria-label": "Flows", children: [_jsxs("div", { className: "matt-flow-list-heading", children: [_jsx("h2", { children: t('nav') }), _jsx("button", { type: "button", onClick: () => store.toggleCreate(), children: t('create') })] }), state.showCreate ? _jsx(CreateFlowForm, { store: store, t: t, busy: state.busy }) : null, state.error ? _jsx("p", { className: "matt-flow-error", role: "alert", children: state.error }) : null, state.flows.length === 0 && !state.busy ? _jsxs("div", { className: "matt-flow-empty", children: [_jsx("strong", { children: t('empty') }), _jsx("span", { children: t('emptyHint') })] }) : null, state.flows.map(flow => _jsx(FlowListItem, { flow: flow, selected: flow.id === selected?.id, t: t, onClick: () => store.select(flow.id) }, flow.id))] }), _jsx("section", { className: "matt-flow-detail", "aria-live": "polite", children: selected ? _jsx(FlowDetail, { flow: selected, t: t, store: store, busy: state.busy }) : _jsx("div", { className: "matt-flow-empty matt-flow-detail-empty", children: t('emptyHint') }) })] })] }) }));
}
function CreateFlowForm({ store, t, busy }) {
    const [title, setTitle] = React.useState('');
    const [repoRoot, setRepoRoot] = React.useState('');
    return (_jsxs("form", { className: "matt-flow-create-form", onSubmit: event => { event.preventDefault(); void store.create(title, repoRoot); }, children: [_jsxs("label", { children: [t('flowTitle'), _jsx("input", { value: title, placeholder: t('flowTitlePlaceholder'), onChange: event => setTitle(event.target.value), required: true })] }), _jsxs("label", { children: [t('repository'), _jsx("input", { value: repoRoot, placeholder: t('repositoryPlaceholder'), onChange: event => setRepoRoot(event.target.value), required: true })] }), _jsxs("div", { className: "matt-flow-form-actions", children: [_jsx("button", { type: "submit", disabled: busy, children: t('createFlow') }), _jsx("button", { type: "button", onClick: () => store.toggleCreate(), children: t('cancel') })] })] }));
}
function FlowListItem({ flow, selected, t, onClick }) {
    return (_jsxs("button", { className: `matt-flow-list-item${selected ? ' is-selected' : ''}`, type: "button", onClick: onClick, children: [_jsx("span", { className: "matt-flow-status-dot", "data-phase": flow.phase, "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("strong", { children: flow.title }), _jsx("small", { children: t(flow.phase) })] })] }));
}
function FlowDetail({ flow, t, store, busy }) {
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "matt-flow-detail-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "matt-flow-eyebrow", children: flow.id }), _jsx("h2", { children: flow.title })] }), _jsx("span", { className: "matt-flow-phase", children: t(flow.phase) })] }), _jsxs("div", { className: "matt-flow-next", children: [_jsx("span", { children: t('nextAction') }), _jsx("strong", { children: flow.nextAction }), _jsxs("span", { children: [t('revision'), " ", flow.revision] })] }), _jsxs("div", { className: "matt-flow-metrics", children: [_jsx(Metric, { label: t('decisions'), value: flow.decisions.length }), _jsx(Metric, { label: t('tickets'), value: flow.tickets.length }), _jsx(Metric, { label: t('lanes'), value: flow.lanes.length }), _jsx(Metric, { label: t('questions'), value: flow.questions.filter(question => question.status === 'pending').length })] }), _jsxs("section", { className: "matt-flow-panel", children: [_jsx("h3", { children: t('advance') }), _jsx("p", { children: t('advanceTo') }), _jsx("div", { className: "matt-flow-phase-grid", children: phaseKeys.map(phase => _jsx("button", { type: "button", disabled: busy || phase === flow.phase, onClick: () => void store.advance(flow, phase), children: t(phase) }, phase)) })] }), _jsxs("section", { className: "matt-flow-panel", children: [_jsx("h3", { children: t('repository') }), _jsx("code", { children: flow.repoRoot })] })] }));
}
function Metric({ label, value }) {
    return _jsxs("article", { className: "matt-flow-metric", children: [_jsx("strong", { children: value }), _jsx("span", { children: label })] });
}
//# sourceMappingURL=components.js.map