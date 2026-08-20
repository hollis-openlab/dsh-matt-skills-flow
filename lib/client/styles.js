export const STYLES = String.raw `
.matt-flow-launcher{display:flex;align-items:center;gap:8px;width:100%;min-height:36px;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;font:inherit;text-align:left}
.matt-flow-launcher:hover{background:var(--surface-hover);color:var(--text)}
.matt-flow-launcher-mark{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:var(--brand);color:var(--on-brand,#fff);font-size:12px;font-weight:800}
.matt-flow-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:stretch;justify-content:center;background:color-mix(in srgb,var(--overlay,#000) 42%,transparent);padding:24px}
.matt-flow-shell{display:flex;flex-direction:column;width:min(1180px,100%);min-height:0;overflow:hidden;border:1px solid var(--outline);border-radius:18px;background:var(--surface,var(--card));box-shadow:0 24px 90px rgb(0 0 0 / .28);color:var(--text)}
.matt-flow-header{display:flex;justify-content:space-between;gap:20px;padding:24px 28px;border-bottom:1px solid var(--outline)}
.matt-flow-header h1,.matt-flow-detail-heading h2{margin:0;font-size:22px;letter-spacing:-.02em}
.matt-flow-header p{margin:6px 0 0;color:var(--text-secondary)}
.matt-flow-eyebrow{margin:0 0 6px!important;color:var(--brand);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.matt-flow-header-actions,.matt-flow-form-actions{display:flex;align-items:flex-start;gap:8px}
.matt-flow-header button,.matt-flow-list-heading button,.matt-flow-form-actions button,.matt-flow-phase-grid button{border:1px solid var(--outline);border-radius:8px;background:var(--surface-muted,var(--card));color:var(--text);padding:7px 10px;cursor:pointer;font:inherit}
.matt-flow-header button:hover,.matt-flow-list-heading button:hover,.matt-flow-form-actions button:hover,.matt-flow-phase-grid button:hover{background:var(--surface-hover)}
.matt-flow-header button:disabled,.matt-flow-phase-grid button:disabled{cursor:not-allowed;opacity:.5}
.matt-flow-main{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:0;flex:1}
.matt-flow-list{min-width:0;overflow:auto;border-right:1px solid var(--outline);padding:16px}
.matt-flow-list-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.matt-flow-list-heading h2{margin:0;font-size:14px}
.matt-flow-list-heading button{font-size:12px}
.matt-flow-list-item{display:flex;align-items:center;gap:10px;width:100%;padding:11px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text);cursor:pointer;text-align:left}
.matt-flow-list-item:hover,.matt-flow-list-item.is-selected{background:var(--surface-hover);border-color:var(--outline)}
.matt-flow-list-item strong,.matt-flow-list-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.matt-flow-list-item strong{font-size:13px}.matt-flow-list-item small{margin-top:3px;color:var(--text-secondary);font-size:11px}
.matt-flow-status-dot{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#8d98a8}
.matt-flow-status-dot[data-phase=accepted]{background:#31a56a}.matt-flow-status-dot[data-phase=running]{background:#3d87e8}.matt-flow-status-dot[data-phase=needs-human]{background:#e0a52b}.matt-flow-status-dot[data-phase=failed],.matt-flow-status-dot[data-phase=aborted]{background:#dc5b65}
.matt-flow-create-form{display:flex;flex-direction:column;gap:10px;margin-bottom:12px;padding:12px;border:1px solid var(--outline);border-radius:10px;background:var(--surface-muted,var(--card))}
.matt-flow-create-form label{display:flex;flex-direction:column;gap:4px;color:var(--text-secondary);font-size:11px}
.matt-flow-create-form input{width:100%;box-sizing:border-box;border:1px solid var(--outline);border-radius:7px;background:var(--surface,var(--card));color:var(--text);padding:7px 8px;font:inherit;font-size:12px}
.matt-flow-error{margin:8px 0;padding:8px;border-radius:8px;background:color-mix(in srgb,#d9535f 14%,transparent);color:var(--text);font-size:12px}
.matt-flow-empty{display:flex;flex-direction:column;gap:8px;padding:24px 12px;color:var(--text-secondary);font-size:12px}.matt-flow-detail{min-width:0;overflow:auto;padding:28px}.matt-flow-detail-empty{align-items:center;justify-content:center;height:100%}
.matt-flow-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.matt-flow-phase{display:inline-flex;padding:6px 10px;border-radius:999px;background:var(--brand-soft,var(--surface-muted));color:var(--brand);font-size:12px;font-weight:700}
.matt-flow-next{display:flex;align-items:center;gap:12px;margin-top:20px;padding:14px;border:1px solid color-mix(in srgb,var(--brand) 40%,var(--outline));border-radius:12px;background:var(--brand-soft,var(--surface-muted))}.matt-flow-next span{color:var(--text-secondary);font-size:12px}.matt-flow-next strong{flex:1;font-size:14px}
.matt-flow-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.matt-flow-metric{display:flex;flex-direction:column;gap:4px;padding:14px;border:1px solid var(--outline);border-radius:12px;background:var(--surface-muted,var(--card))}.matt-flow-metric strong{font-size:22px}.matt-flow-metric span{color:var(--text-secondary);font-size:11px}
.matt-flow-panel{margin-top:16px;padding:16px;border:1px solid var(--outline);border-radius:12px}.matt-flow-panel h3{margin:0;font-size:14px}.matt-flow-panel p{margin:7px 0;color:var(--text-secondary);font-size:12px}.matt-flow-panel code{display:block;overflow:auto;color:var(--text-secondary);font-size:12px}.matt-flow-phase-grid{display:flex;flex-wrap:wrap;gap:8px}.matt-flow-phase-grid button{font-size:11px}
@media (max-width:760px){.matt-flow-overlay{padding:0}.matt-flow-shell{border:0;border-radius:0}.matt-flow-header{padding:18px;flex-direction:column}.matt-flow-main{grid-template-columns:1fr}.matt-flow-list{max-height:38vh;border-right:0;border-bottom:1px solid var(--outline)}.matt-flow-detail{padding:18px}.matt-flow-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.matt-flow-next{align-items:flex-start;flex-direction:column;gap:5px}}
`;
//# sourceMappingURL=styles.js.map