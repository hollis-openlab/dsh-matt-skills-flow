import type { FlowAction, FlowPhase } from './domain.ts';
/** Parsed `/matt-flow` input after the command registry removes the name. */
export interface MattFlowCommandInput {
    readonly verb: string | undefined;
    readonly argument: string;
    readonly tokens: readonly string[];
}
/**
 * Split command input while preserving quoted Flow names as one token.
 * @param rawInput - Text following `/matt-flow`.
 * @returns The lowercase verb, normalized argument, and parsed tokens.
 */
export declare function parseMattFlowCommand(rawInput: string): MattFlowCommandInput;
/**
 * Resolve the one safe phase transition that `/matt-flow continue` may own.
 * Ambiguous planning and review phases require an explicit UI decision.
 * @param phase - Current durable Flow phase.
 * @returns A single action, or `undefined` when the user must choose one.
 */
export declare function continueActionFor(phase: FlowPhase): FlowAction | undefined;
