import React, { useSyncExternalStore } from 'react'
import type { FlowRecord } from '../domain.ts'
import { defaultTransitionFor } from '../domain.ts'
import type { MattSkillsFlowLocaleKey } from './locales.ts'
import { FlowUiStore } from './store.ts'

type Translate = (key: MattSkillsFlowLocaleKey) => string

interface LauncherProps {
  readonly wide?: boolean
  readonly store: FlowUiStore
  readonly t: Translate
}

interface ShellProps {
  readonly store: FlowUiStore
  readonly t: Translate
}

function useStore(store: FlowUiStore) {
  return useSyncExternalStore(listener => store.subscribe(listener), () => store.snapshot(), () => store.snapshot())
}

export function MattFlowLauncher({ wide = true, store, t }: LauncherProps): React.ReactElement {
  return (
    <button className="matt-flow-launcher" type="button" title={t('open')} onClick={() => store.open()}>
      <span className="matt-flow-launcher-mark" aria-hidden="true">M</span>
      {wide ? <span>{t('nav')}</span> : null}
    </button>
  )
}

export function MattFlowShell({ store, t }: ShellProps): React.ReactElement | null {
  const state = useStore(store)
  if (!state.open) return null
  const selected = state.flows.find(flow => flow.id === state.selected)
  return (
    <div className="matt-flow-overlay" role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className="matt-flow-shell">
        <header className="matt-flow-header">
          <div>
            <p className="matt-flow-eyebrow">Matt Skills</p>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="matt-flow-header-actions">
            <button type="button" onClick={() => void store.load()} disabled={state.busy}>{t('refresh')}</button>
            <button type="button" onClick={() => store.close()}>{t('close')}</button>
          </div>
        </header>
        <main className="matt-flow-main">
          <aside className="matt-flow-list" aria-label="Flows">
            <div className="matt-flow-list-heading">
              <h2>{t('nav')}</h2>
              <button type="button" onClick={() => store.toggleCreate()}>{t('create')}</button>
            </div>
            {state.showCreate ? <CreateFlowForm store={store} t={t} busy={state.busy} /> : null}
            {state.error ? <p className="matt-flow-error" role="alert">{state.error}</p> : null}
            {state.flows.length === 0 && !state.busy ? <div className="matt-flow-empty"><strong>{t('empty')}</strong><span>{t('emptyHint')}</span></div> : null}
            {state.flows.map(flow => <FlowListItem key={flow.id} flow={flow} selected={flow.id === selected?.id} t={t} onClick={() => store.select(flow.id)} />)}
          </aside>
          <section className="matt-flow-detail" aria-live="polite">
            {selected ? <FlowDetail flow={selected} t={t} store={store} busy={state.busy} frontier={state.frontier} /> : <div className="matt-flow-empty matt-flow-detail-empty">{t('emptyHint')}</div>}
          </section>
        </main>
      </div>
    </div>
  )
}

function CreateFlowForm({ store, t, busy }: { store: FlowUiStore; t: Translate; busy: boolean }): React.ReactElement {
  const [title, setTitle] = React.useState('')
  const [repoRoot, setRepoRoot] = React.useState('')
  return (
    <form className="matt-flow-create-form" onSubmit={event => { event.preventDefault(); void store.create(title, repoRoot) }}>
      <label>{t('flowTitle')}<input value={title} placeholder={t('flowTitlePlaceholder')} onChange={event => setTitle(event.target.value)} required /></label>
      <label>{t('repository')}<input value={repoRoot} placeholder={t('repositoryPlaceholder')} onChange={event => setRepoRoot(event.target.value)} required /></label>
      <div className="matt-flow-form-actions"><button type="submit" disabled={busy}>{t('createFlow')}</button><button type="button" onClick={() => store.toggleCreate()}>{t('cancel')}</button></div>
    </form>
  )
}

function FlowListItem({ flow, selected, t, onClick }: { flow: FlowRecord; selected: boolean; t: Translate; onClick: () => void }): React.ReactElement {
  return (
    <button className={`matt-flow-list-item${selected ? ' is-selected' : ''}`} type="button" onClick={onClick}>
      <span className="matt-flow-status-dot" data-phase={flow.phase} aria-hidden="true" />
      <span><strong>{flow.title}</strong><small>{t(flow.phase as MattSkillsFlowLocaleKey)}</small></span>
    </button>
  )
}

function FlowDetail({ flow, t, store, busy, frontier }: { flow: FlowRecord; t: Translate; store: FlowUiStore; busy: boolean; frontier?: import('../domain.ts').FrontierPlan }): React.ReactElement {
  const nextTransition = defaultTransitionFor(flow)
  const [question, setQuestion] = React.useState('')
  const [answer, setAnswer] = React.useState('')
  const [questionAnswers, setQuestionAnswers] = React.useState<Record<string, string>>({})
  const [ticketTitle, setTicketTitle] = React.useState('')
  const [ticketCriteria, setTicketCriteria] = React.useState('')
  const [ticketRole, setTicketRole] = React.useState('')
  const [editingTicketId, setEditingTicketId] = React.useState<string | undefined>()
  const [activityKind, setActivityKind] = React.useState<'research' | 'prototype' | 'wayfinder'>('research')
  const [activityQuestion, setActivityQuestion] = React.useState('')
  const [expectedEvidence, setExpectedEvidence] = React.useState('')
  const [activityOutput, setActivityOutput] = React.useState('')
  const [activitySourceRef, setActivitySourceRef] = React.useState('')
  const [activityHandoff, setActivityHandoff] = React.useState<'to-grilling' | 'to-spec' | 'to-tickets'>('to-grilling')
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [returnTo, setReturnTo] = React.useState<'grilling' | 'wayfinding' | 'ticketing'>('grilling')
  const snapshotStatus = flow.skillSnapshot?.status === 'ready' ? t('skillSnapshotReady') : t('skillSnapshotUnknown')
  const saveDecision = (): void => {
    if (question.trim().length === 0 || answer.trim().length === 0) return
    void store.decide(flow, question, answer)
    setQuestion('')
    setAnswer('')
  }
  const saveTicket = (): void => {
    if (ticketTitle.trim().length === 0) return
    const criteria = ticketCriteria.split('\n').map(item => item.trim()).filter(Boolean)
    const role = ticketRole.trim() || undefined
    if (editingTicketId === undefined) void store.ticket(flow, ticketTitle, [], criteria, role)
    else void store.updateTicket(flow, editingTicketId, ticketTitle, [], criteria, role)
    setTicketTitle('')
    setTicketCriteria('')
    setTicketRole('')
    setEditingTicketId(undefined)
  }
  const editTicket = (ticket: FlowRecord['tickets'][number]): void => {
    setEditingTicketId(ticket.id)
    setTicketTitle(ticket.title)
    setTicketCriteria((ticket.acceptanceCriteria ?? []).join('\n'))
    setTicketRole(ticket.workflowRole ?? '')
  }
  const openActivity = (flow.activities ?? []).find(activity => activity.status === 'open')
  const startActivity = (): void => {
    if (activityQuestion.trim().length === 0) return
    void store.startActivity(flow, activityKind, activityQuestion, expectedEvidence.trim() || undefined)
    setActivityQuestion('')
    setExpectedEvidence('')
  }
  const completeActivity = (): void => {
    if (openActivity === undefined || activityOutput.trim().length === 0 || activitySourceRef.trim().length === 0) return
    void store.completeActivity(flow, openActivity.id, activityOutput, activitySourceRef, openActivity.kind === 'wayfinder' ? activityHandoff : undefined)
    setActivityOutput('')
    setActivitySourceRef('')
  }
  const rejectCandidate = (): void => {
    if (rejectionReason.trim().length === 0) return
    void store.rejectAcceptance(flow, rejectionReason, returnTo)
    setRejectionReason('')
  }
  return (
    <>
      <div className="matt-flow-detail-heading"><div><p className="matt-flow-eyebrow">{flow.id}</p><h2>{flow.title}</h2></div><span className="matt-flow-phase">{t(flow.phase as MattSkillsFlowLocaleKey)}</span></div>
      <div className="matt-flow-next"><span>{t('nextAction')}</span><strong>{flow.nextAction}</strong><span>{t('revision')} {flow.revision}</span></div>
      <div className="matt-flow-metrics">
        <Metric label={t('decisions')} value={flow.decisions.length} />
        <Metric label={t('tickets')} value={flow.tickets.length} />
        <Metric label={t('lanes')} value={flow.lanes.length} />
        <Metric label={t('questions')} value={flow.questions.filter(question => question.status === 'pending').length} />
      </div>
      {flow.questions.filter(question => question.status === 'pending').length > 0 ? <section className="matt-flow-panel"><h3>{t('questions')}</h3>{flow.questions.filter(question => question.status === 'pending').map(question => <form className="matt-flow-question-row" key={question.id} onSubmit={event => { event.preventDefault(); const value = questionAnswers[question.id] ?? ''; if (value.trim().length > 0) { void store.answerQuestion(flow, question.id, value); setQuestionAnswers(current => ({ ...current, [question.id]: '' })) } }}><p>{question.question}</p><input value={questionAnswers[question.id] ?? ''} placeholder={t('questionAnswerPlaceholder')} onChange={event => setQuestionAnswers(current => ({ ...current, [question.id]: event.target.value }))} /><button type="submit" disabled={busy || (questionAnswers[question.id] ?? '').trim().length === 0}>{t('answerQuestion')}</button></form>)}</section> : null}
      <section className="matt-flow-panel"><h3>{t('spec')}</h3>{flow.spec?.status === 'approved' ? <><p>{t('specApproved')}</p><code>{flow.spec.sha256}</code></> : flow.spec?.status === 'draft' ? <><button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.approveSpec(flow)}>{t('approveSpec')}</button><code>{flow.spec.sha256}</code></> : <button type="button" className="matt-flow-primary-action" disabled={busy || flow.decisions.length === 0} onClick={() => void store.generateSpec(flow)}>{t('generateSpec')}</button>}</section>
      <section className="matt-flow-panel"><h3>{t('evidence')}</h3><button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.exportEvidence(flow)}>{t('exportEvidence')}</button>{flow.export ? <code>{flow.export.sha256}</code> : null}</section>
      <section className="matt-flow-panel"><h3>{t('advance')}</h3><p>{t('advanceTo')}</p>{nextTransition ? <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.advance(flow, nextTransition.action)}>{t(nextTransition.to)}</button> : <strong>{t(flow.phase)}</strong>}{flow.phase === 'intake' ? <><button type="button" disabled={busy} onClick={() => void store.advance(flow, 'start-bug')}>{t('startBug')}</button><button type="button" disabled={busy} onClick={() => void store.advance(flow, 'start-large-effort')}>{t('startLargeEffort')}</button></> : null}</section>
      <section className="matt-flow-panel"><h3>{t('activities')}</h3>{openActivity === undefined ? <form className="matt-flow-decision-form" onSubmit={event => { event.preventDefault(); startActivity() }}><label>{t('activityKind')}<select value={activityKind} onChange={event => setActivityKind(event.target.value as typeof activityKind)}><option value="research">{t('research')}</option><option value="prototype">{t('prototype')}</option><option value="wayfinder">{t('wayfinder')}</option></select></label><label>{t('activityQuestion')}<input value={activityQuestion} placeholder={t('activityQuestionPlaceholder')} onChange={event => setActivityQuestion(event.target.value)} /></label><label>{t('expectedEvidence')}<input value={expectedEvidence} placeholder={t('expectedEvidencePlaceholder')} onChange={event => setExpectedEvidence(event.target.value)} /></label><button type="submit" disabled={busy || activityQuestion.trim().length === 0}>{t('startActivity')}</button></form> : <form className="matt-flow-decision-form" onSubmit={event => { event.preventDefault(); completeActivity() }}><p><strong>{t(openActivity.kind)}</strong> · {openActivity.question}</p><label>{t('activityOutput')}<textarea value={activityOutput} placeholder={t('activityOutputPlaceholder')} onChange={event => setActivityOutput(event.target.value)} /></label><label>{t('activitySourceRef')}<input value={activitySourceRef} placeholder={t('activitySourceRefPlaceholder')} onChange={event => setActivitySourceRef(event.target.value)} /></label>{openActivity.kind === 'wayfinder' ? <label>{t('activityHandoff')}<select value={activityHandoff} onChange={event => setActivityHandoff(event.target.value as typeof activityHandoff)}><option value="to-grilling">{t('toGrilling')}</option><option value="to-spec">{t('toSpec')}</option><option value="to-tickets">{t('toTickets')}</option></select></label> : null}<button type="submit" disabled={busy || activityOutput.trim().length === 0 || activitySourceRef.trim().length === 0}>{t('completeActivity')}</button></form>}{(flow.activities ?? []).filter(activity => activity.status === 'completed').map(activity => <p key={activity.id}><strong>{t(activity.kind)}</strong> · {activity.output} · <code>{activity.sourceRef}</code>{activity.handoff ? ` · ${t(activity.handoff === 'to-grilling' ? 'toGrilling' : activity.handoff === 'to-spec' ? 'toSpec' : 'toTickets')}` : ''}</p>)}</section>
      <section className="matt-flow-panel"><h3>{t('skills')}</h3><p>{snapshotStatus} · {flow.skillSnapshot?.count ?? 0}</p>{flow.skillSnapshot?.aggregateSha256 ? <code>{flow.skillSnapshot.aggregateSha256}</code> : null}</section>
      <section className="matt-flow-panel"><h3>{t('decisions')}</h3><form className="matt-flow-decision-form" onSubmit={event => { event.preventDefault(); saveDecision() }}><label>{t('decisionQuestion')}<input value={question} placeholder={t('decisionQuestionPlaceholder')} onChange={event => setQuestion(event.target.value)} /></label><label>{t('decisionAnswer')}<textarea value={answer} placeholder={t('decisionAnswerPlaceholder')} onChange={event => setAnswer(event.target.value)} /></label><button type="submit" disabled={busy || question.trim().length === 0 || answer.trim().length === 0}>{t('saveDecision')}</button></form></section>
      <section className="matt-flow-panel"><h3>{t('tickets')}</h3><form className="matt-flow-decision-form" onSubmit={event => { event.preventDefault(); saveTicket() }}><label>{t('ticketTitle')}<input value={ticketTitle} placeholder={t('ticketTitlePlaceholder')} onChange={event => setTicketTitle(event.target.value)} /></label><label>{t('ticketCriteria')}<textarea value={ticketCriteria} placeholder={t('ticketCriteriaPlaceholder')} onChange={event => setTicketCriteria(event.target.value)} /></label><label>{t('ticketRole')}<input value={ticketRole} placeholder={t('ticketRolePlaceholder')} onChange={event => setTicketRole(event.target.value)} /></label><button type="submit" disabled={busy || ticketTitle.trim().length === 0}>{editingTicketId === undefined ? t('addTicket') : t('updateTicket')}</button></form>{flow.tickets.length > 0 ? <div className="matt-flow-publish-row"><button type="button" disabled={busy} onClick={() => void store.publish(flow)}>{flow.tracker ? t('graphPublished') : t('publishGraph')}</button>{flow.tracker ? <code>{flow.tracker.graphSha256}</code> : null}</div> : null}</section>
      {flow.tickets.length > 0 ? <section className="matt-flow-panel"><h3>{t('frontier')}</h3><button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.previewFrontier(flow)}>{t('previewFrontier')}</button>{frontier?.flowId === flow.id ? <><p>{frontier.tickets.length > 0 ? frontier.tickets.join(', ') : t('frontierEmpty')}</p><small>{frontier.maxConcurrent} concurrent · depth {frontier.maxDepth} · {frontier.maxTotalAgents} agents</small>{frontier.tickets.length > 0 ? <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.startFrontier(flow, frontier.maxConcurrent)}>{t('startFrontier')}</button> : null}{frontier.warnings.map(warning => <p key={warning}>{warning}</p>)}</> : null}</section> : null}
      <section className="matt-flow-panel"><h3>{t('lanes')}</h3>{flow.tickets.length === 0 ? <p>{t('emptyHint')}</p> : <div className="matt-flow-ticket-list">{flow.tickets.map(ticket => { const lane = flow.lanes.find(item => item.ticketId === ticket.id && !['failed', 'cancelled'].includes(item.status)) ?? flow.lanes.find(item => item.ticketId === ticket.id && ['failed', 'cancelled'].includes(item.status) && item.worktreePath !== undefined); return <div className="matt-flow-ticket-row" key={ticket.id}><span><strong>{ticket.title}</strong><code>{ticket.id}</code></span>{lane === undefined ? <button type="button" disabled={busy} onClick={() => editTicket(ticket)}>{t('editTicket')}</button> : null}{lane?.status === 'preparing' ? <button type="button" disabled={busy} onClick={() => void store.provisionLane(flow, lane.id)}>{t('createWorktree')}</button> : lane?.status === 'ready' ? <button type="button" disabled={busy} onClick={() => void store.runLane(flow, lane.id)}>{t('runLane')}</button> : lane?.status === 'running' ? <small>{t('laneRunning')}</small> : lane?.status === 'completed' ? <>{<small>{t('laneCompleted')}</small>}{lane.commit !== undefined ? <button type="button" disabled={busy} onClick={() => void store.integrate(flow, lane.id)}>{t('integrateLane')}</button> : null}{lane.worktreePath !== undefined ? <button type="button" disabled={busy} onClick={() => void store.cleanup(flow, lane.id)}>{t('cleanupWorktree')}</button> : null}</> : lane?.status === 'integrated' ? <>{<small>{t('laneIntegrated')}</small>}{lane.worktreePath !== undefined ? <button type="button" disabled={busy} onClick={() => void store.cleanup(flow, lane.id)}>{t('cleanupWorktree')}</button> : null}</> : lane?.status === 'failed' || lane?.status === 'cancelled' ? <>{<small>{t('laneFailed')}</small>}{lane.worktreePath !== undefined ? <button type="button" disabled={busy} onClick={() => void store.cleanup(flow, lane.id)}>{t('cleanupWorktree')}</button> : null}</> : lane ? <small>{t('worktreeReady')}</small> : <button type="button" disabled={busy} onClick={() => void store.lane(flow, ticket.id)}>{t('prepareLane')}</button>}</div> })}</div>}</section>
      {flow.lanes.some(lane => lane.status === 'completed' || lane.status === 'integrated') && flow.phase !== 'accepted' ? <section className="matt-flow-panel"><h3>{t('acceptance')}</h3>{flow.review ? <>{flow.review.status === 'frozen' || flow.review.status === 'failed' || (flow.review.status === 'complete' && (flow.review.findings ?? []).some(finding => finding.severity !== 'note' && finding.disposition === undefined)) ? <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.requestReview(flow)}>{t('requestReview')}</button> : flow.review.status === 'running' ? <p>{t('reviewRunning')}</p> : <><p>{t('reviewComplete')}</p>{flow.acceptance?.status === 'ready' && flow.acceptance.candidateCommit !== undefined ? <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.accept(flow)}>{t('acceptCandidate')}</button> : <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.prepareAcceptance(flow)}>{t('prepareAcceptance')}</button>}</>}<code>{flow.review.candidateSha256}</code>{(flow.review.findings ?? []).map(finding => <p key={finding.id}>{finding.axis} · {finding.severity} · {finding.title}{finding.disposition ? ` · ${finding.disposition.kind}` : finding.severity !== 'note' ? <button type="button" disabled={busy} onClick={() => void store.disposeFinding(flow, finding.id)}>{t('disposeFinding')}</button> : null}</p>)}</> : <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.prepareAcceptance(flow)}>{t('prepareAcceptance')}</button>}{flow.review?.status === 'complete' && flow.acceptance?.status === 'ready' ? <form className="matt-flow-decision-form" onSubmit={event => { event.preventDefault(); rejectCandidate() }}><label>{t('rejectionReason')}<textarea value={rejectionReason} placeholder={t('rejectionReasonPlaceholder')} onChange={event => setRejectionReason(event.target.value)} /></label><label>{t('returnTo')}<select value={returnTo} onChange={event => setReturnTo(event.target.value as typeof returnTo)}><option value="grilling">{t('grilling')}</option><option value="wayfinding">{t('wayfinding')}</option><option value="ticketing">{t('ticketing')}</option></select></label><button type="submit" disabled={busy || rejectionReason.trim().length === 0}>{t('rejectCandidate')}</button></form> : null}</section> : null}
      {flow.rootSessionId !== undefined && flow.phase !== 'accepted' && flow.phase !== 'aborted' ? <section className="matt-flow-panel"><h3>{t('recoveryReconciled')}</h3>{flow.recovery?.status === 'reconciled' ? <p>{t('recoveryReconciled')}</p> : <button type="button" className="matt-flow-primary-action" disabled={busy} onClick={() => void store.resume(flow)}>{t('resumeFlow')}</button>}</section> : null}
      {flow.phase !== 'accepted' && flow.phase !== 'aborted' ? <section className="matt-flow-panel"><h3>{t('phase')}</h3>{flow.phase !== 'paused' ? <button type="button" disabled={busy} onClick={() => void store.advance(flow, 'pause')}>{t('pauseFlow')}</button> : <button type="button" disabled={busy} onClick={() => void store.advance(flow, 'resume')}>{t('resumeFlow')}</button>}<button type="button" disabled={busy} onClick={() => void store.advance(flow, 'abort')}>{t('abortFlow')}</button></section> : null}
      <section className="matt-flow-panel"><h3>{t('repository')}</h3><code>{flow.repoRoot}</code></section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }): React.ReactElement {
  return <article className="matt-flow-metric"><strong>{value}</strong><span>{label}</span></article>
}
