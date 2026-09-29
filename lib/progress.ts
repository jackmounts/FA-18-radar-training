const TUTORIAL = 'apg73.tutorialSeen';
const DONE = 'apg73.lessonsDone';
export const PROGRESS_EVENT = 'apg73:progress';

export function lessonsDone(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DONE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markLessonDone(id: string) {
  try {
    localStorage.setItem(DONE, JSON.stringify([...new Set([...lessonsDone(), id])]));
  } catch {
    // storage unavailable (private mode, blocked): progress simply isn't kept
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

/** True when the welcome dialog should stay closed. Unavailable storage counts as seen, so we never nag on every visit. */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL, '1');
  } catch {
    // see markLessonDone
  }
}

/** For useSyncExternalStore: fires on local progress changes and on other tabs' storage writes. */
export function subscribeProgress(cb: () => void) {
  window.addEventListener(PROGRESS_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
