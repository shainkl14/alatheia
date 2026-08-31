/** Shared across deploy, CLI, tests, and browser — must stay in sync. */
export const aletheiaPrivateStateKey = 'aletheiaPrivateState' as const;
export type AletheiaPrivateStateId = typeof aletheiaPrivateStateKey;
