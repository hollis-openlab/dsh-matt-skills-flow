import type { FlowAction, FlowPhase } from './domain.ts'

/** Parsed `/matt-flow` input after the command registry removes the name. */
export interface MattFlowCommandInput {
  readonly verb: string | undefined
  readonly argument: string
  readonly tokens: readonly string[]
}

/**
 * Split command input while preserving quoted Flow names as one token.
 * @param rawInput - Text following `/matt-flow`.
 * @returns The lowercase verb, normalized argument, and parsed tokens.
 */
export function parseMattFlowCommand(rawInput: string): MattFlowCommandInput {
  const tokens: string[] = []
  const tokenPattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+)/gu
  for (const match of rawInput.matchAll(tokenPattern)) {
    const value = match[1] ?? match[2] ?? match[3]
    if (value !== undefined) tokens.push(value.replaceAll('\\"', '"').replaceAll("\\'", "'"))
  }
  const [verb, ...arguments_] = tokens
  return { verb: verb?.toLowerCase(), argument: arguments_.join(' ').trim(), tokens: Object.freeze(tokens) }
}

/**
 * Resolve the one safe phase transition that `/matt-flow continue` may own.
 * Ambiguous planning and review phases require an explicit UI decision.
 * @param phase - Current durable Flow phase.
 * @returns A single action, or `undefined` when the user must choose one.
 */
export function continueActionFor(phase: FlowPhase): FlowAction | undefined {
  const actions: Partial<Record<FlowPhase, FlowAction>> = {
    intake: 'start-feature',
    'spec-ready': 'begin-ticketing',
    ticketing: 'approve-graph',
    'tickets-ready': 'request-frontier',
    'execution-preflight': 'approve-frontier',
    'review-admission': 'admit-review',
    paused: 'resume',
    failed: 'recover',
  }
  return actions[phase]
}
