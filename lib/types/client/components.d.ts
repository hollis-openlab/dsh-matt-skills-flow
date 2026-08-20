import React from 'react';
import type { MattSkillsFlowLocaleKey } from './locales.ts';
import { FlowUiStore } from './store.ts';
type Translate = (key: MattSkillsFlowLocaleKey) => string;
interface LauncherProps {
    readonly wide?: boolean;
    readonly store: FlowUiStore;
    readonly t: Translate;
}
interface ShellProps {
    readonly store: FlowUiStore;
    readonly t: Translate;
}
export declare function MattFlowLauncher({ wide, store, t }: LauncherProps): React.ReactElement;
export declare function MattFlowShell({ store, t }: ShellProps): React.ReactElement | null;
export {};
