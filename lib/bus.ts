import type { Difficulty } from './sim/encounters.ts';

export type StartRequest = { kind: 'sandbox' } | { kind: 'lesson'; id: string } | { kind: 'freeplay'; difficulty: Difficulty };

export const START_EVENT = 'apg73:start';

/** Ask the cockpit to start an activity (lesson cards live outside the cockpit's component tree). */
export function requestStart(req: StartRequest) {
  window.dispatchEvent(new CustomEvent<StartRequest>(START_EVENT, { detail: req }));
}
