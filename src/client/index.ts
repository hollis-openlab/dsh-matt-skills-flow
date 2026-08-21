import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import reactFlowStyles from '@xyflow/react/dist/style.css'
import { MattFlowLauncher, MattFlowShell } from './components.tsx'
import { en, NS, zh, type MattSkillsFlowLocaleKey } from './locales.ts'
import { FlowUiStore } from './store.ts'
import { TYPERT_REMOTE, type FlowRemote } from '../remote.ts'
import { STYLES } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    mattSkillsFlow: MattSkillsFlowLocaleKey
  }
}

export const name = 'dsh-matt-skills-flow'
export const inject = ['slots', 'locale', 'remote']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-matt-skills-flow: dictionaries')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = name
    style.textContent = `${reactFlowStyles}\n${STYLES}`
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'dsh-matt-skills-flow: styles')

  const t = ctx.locale.bind(NS)
  const mount = ctx.remote.$mount(TYPERT_REMOTE)
  const remote: FlowRemote = {
    list: async signal => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.list(signal)
    },
    get: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.get(request, signal)
    },
    create: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.create(request, signal)
    },
    advance: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.advance(request, signal)
    },
    decide: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.decide(request, signal)
    },
    ticket: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.ticket(request, signal)
    },
    updateTicket: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.updateTicket(request, signal)
    },
    startActivity: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.startActivity(request, signal)
    },
    completeActivity: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.completeActivity(request, signal)
    },
    rejectAcceptance: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.rejectAcceptance(request, signal)
    },
    lane: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.lane(request, signal)
    },
    publish: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.publish(request, signal)
    },
    provisionLane: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.provisionLane(request, signal)
    },
    runLane: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.runLane(request, signal)
    },
    prepareAcceptance: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.prepareAcceptance(request, signal)
    },
    accept: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.accept(request, signal)
    },
    cleanup: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.cleanup(request, signal)
    },
    integrate: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.integrate(request, signal)
    },
    answerQuestion: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.answerQuestion(request, signal)
    },
    resume: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.resume(request, signal)
    },
    previewFrontier: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.previewFrontier(request, signal)
    },
    startFrontier: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.startFrontier(request, signal)
    },
    requestReview: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.requestReview(request, signal)
    },
    disposeFinding: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.disposeFinding(request, signal)
    },
    generateSpec: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.generateSpec(request, signal)
    },
    approveSpec: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.approveSpec(request, signal)
    },
    exportEvidence: async (request, signal) => {
      await mount
      const mounted = ctx.get('remote.mattSkillsFlow') as FlowRemote | undefined
      if (mounted === undefined) throw new Error('mattSkillsFlow Remote is unavailable after client mount')
      return await mounted.exportEvidence(request, signal)
    },
  }
  const store = new FlowUiStore(remote)

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'matt-skills-flow', order: 30, locale: NS,
    label: () => t('nav'), inject: () => ({ store, t }),
  }, MattFlowLauncher))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'matt-skills-flow', order: 30, locale: NS,
    inject: () => ({ store, t }),
  }, MattFlowShell))
  ctx.effect(async () => await mount, 'dsh-matt-skills-flow: remote mount')
}
