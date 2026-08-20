import { MattFlowLauncher, MattFlowShell } from './components.tsx';
import { en, NS, zh } from './locales.ts';
import { FlowUiStore } from './store.ts';
import { TYPERT_REMOTE } from '../remote.ts';
import { STYLES } from './styles.ts';
export const name = 'dsh-matt-skills-flow';
export const inject = ['slots', 'locale', 'remote'];
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-matt-skills-flow: dictionaries');
    ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = name;
        style.textContent = STYLES;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, 'dsh-matt-skills-flow: styles');
    const t = ctx.locale.bind(NS);
    const mount = ctx.remote.$mount(TYPERT_REMOTE);
    const remote = {
        list: async (signal) => {
            await mount;
            const mounted = ctx.get('remote.mattSkillsFlow');
            if (mounted === undefined)
                throw new Error('mattSkillsFlow Remote is unavailable after client mount');
            return await mounted.list(signal);
        },
        get: async (request, signal) => {
            await mount;
            const mounted = ctx.get('remote.mattSkillsFlow');
            if (mounted === undefined)
                throw new Error('mattSkillsFlow Remote is unavailable after client mount');
            return await mounted.get(request, signal);
        },
        create: async (request, signal) => {
            await mount;
            const mounted = ctx.get('remote.mattSkillsFlow');
            if (mounted === undefined)
                throw new Error('mattSkillsFlow Remote is unavailable after client mount');
            return await mounted.create(request, signal);
        },
        advance: async (request, signal) => {
            await mount;
            const mounted = ctx.get('remote.mattSkillsFlow');
            if (mounted === undefined)
                throw new Error('mattSkillsFlow Remote is unavailable after client mount');
            return await mounted.advance(request, signal);
        },
    };
    const store = new FlowUiStore(remote);
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action', id: 'matt-skills-flow', order: 30, locale: NS,
        label: () => t('nav'), inject: () => ({ store, t }),
    }, MattFlowLauncher));
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'matt-skills-flow', order: 30, locale: NS,
        inject: () => ({ store, t }),
    }, MattFlowShell));
    ctx.effect(async () => await mount, 'dsh-matt-skills-flow: remote mount');
}
//# sourceMappingURL=index.js.map