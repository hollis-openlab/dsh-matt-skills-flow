import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type MattSkillsFlowLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        mattSkillsFlow: MattSkillsFlowLocaleKey;
    }
}
export declare const name = "dsh-matt-skills-flow";
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
