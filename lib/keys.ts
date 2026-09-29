/** Keyboard map (KeyboardEvent.code). Left hand = throttle, right hand = stick, arrows = fly. */
export const KEYS = {
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
  noseDown: 'ArrowUp',
  noseUp: 'ArrowDown',
  faster: 'Equal',
  slower: 'Minus',
  pause: 'KeyP',
} as const;

const LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Equal: '+',
  Minus: '−',
};

export const keyLabel = (code: string) => LABELS[code] ?? code.replace(/^Key/, '');
