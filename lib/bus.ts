export type StartRequest = { kind: 'sandbox' } | { kind: 'lesson'; id: string };

export const START_EVENT = 'apg73:start';

/** Ask the cockpit to start an activity (lesson cards live outside the cockpit's component tree). */
export function requestStart(req: StartRequest) {
  window.dispatchEvent(new CustomEvent<StartRequest>(START_EVENT, { detail: req }));
}
