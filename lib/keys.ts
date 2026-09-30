/** Every bindable control with its default key (KeyboardEvent.code). Left hand = throttle, right hand = stick, arrows = fly. */
export const DEFAULT_KEYS = {
  tdcUp: 'KeyW',
  tdcDown: 'KeyS',
  tdcLeft: 'KeyA',
  tdcRight: 'KeyD',
  designate: 'Space',
  elevUp: 'KeyR',
  elevDown: 'KeyF',
  castleFwd: 'KeyI',
  castleAft: 'KeyK',
  castleLeft: 'KeyJ',
  castleRight: 'KeyL',
  castlePress: 'KeyO',
  undesignate: 'KeyU',
  turnLeft: 'ArrowLeft',
  turnRight: 'ArrowRight',
  fine: 'ShiftLeft',
  noseDown: 'ArrowUp',
  noseUp: 'ArrowDown',
  faster: 'Equal',
  slower: 'Minus',
  pause: 'KeyP',
  map: 'KeyM',
} as const;

export type Action = keyof typeof DEFAULT_KEYS;

/** Action ids, so call sites read `ACT.designate`. */
export const ACT = Object.fromEntries(Object.keys(DEFAULT_KEYS).map((a) => [a, a])) as { [A in Action]: A };

/** The code a key event binds as: +/- by the character typed (so they work on any layout), either Shift as ShiftLeft. */
export function keyCode(e: { key: string; code: string }) {
  if (e.key === '+') return 'Equal';
  if (e.key === '-') return 'Minus';
  return e.code === 'ShiftRight' ? 'ShiftLeft' : e.code;
}

const LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Equal: '+',
  Minus: '−',
  ShiftLeft: 'Shift',
};

export const keyLabel = (code: string) => LABELS[code] ?? code.replace(/^(Key|Digit)/, '');
