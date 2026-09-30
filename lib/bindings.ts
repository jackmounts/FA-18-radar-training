import { DEFAULT_KEYS, type Action } from './keys.ts';

/** A joystick input on one device (Gamepad.id): a button, or an axis position.
 *  Axis value ±1 = pushed that way past half travel; anything else = one exact position of a POV hat,
 *  which DirectInput devices report on a single axis (≈1.29 when centred). */
export type PadInput = { pad: string; button: number } | { pad: string; axis: number; value: number };
export type Binding = { key: string | null; pad: PadInput | null };
export type Bindings = Record<Action, Binding>;

/** The part of the DOM Gamepad we read. */
export type Pad = { id: string; buttons: readonly { pressed: boolean }[]; axes: readonly number[] };
type Pads = readonly (Pad | null)[];

const ACTIONS = Object.keys(DEFAULT_KEYS) as Action[];
const STORE = 'apg73.bindings';
const EVENT = 'apg73:bindings';

export const defaultBindings = (): Bindings =>
  Object.fromEntries(ACTIONS.map((a) => [a, { key: DEFAULT_KEYS[a], pad: null }])) as Bindings;

const samePad = (a: PadInput | null, b: PadInput | null) => JSON.stringify(a) === JSON.stringify(b);

/** Put an input on an action, taking it away from whichever action had it. */
export function assign(b: Bindings, action: Action, slot: { key: string | null } | { pad: PadInput | null }): Bindings {
  const next = { ...b };
  for (const a of ACTIONS) {
    if ('key' in slot && slot.key !== null && next[a].key === slot.key) next[a] = { ...next[a], key: null };
    if ('pad' in slot && slot.pad !== null && samePad(next[a].pad, slot.pad)) next[a] = { ...next[a], pad: null };
  }
  next[action] = { ...next[action], ...slot };
  return next;
}

export const actionForKey = (b: Bindings, code: string) => ACTIONS.find((a) => b[a].key === code) ?? null;

function axisAt(v: number | undefined, want: number) {
  if (v === undefined || Math.abs(v) > 1.05) return false; // beyond ±1: a centred hat
  return Math.abs(want) === 1 ? v * want >= 0.5 : Math.abs(v - want) < 0.1;
}

function padInputActive(p: PadInput, pads: Pads) {
  return pads.some((g) => g?.id === p.pad && ('button' in p ? !!g.buttons[p.button]?.pressed : axisAt(g.axes[p.axis], p.value)));
}

/** Actions whose joystick input is held right now. */
export function padActions(b: Bindings, pads: Pads) {
  return new Set(ACTIONS.filter((a) => b[a].pad && padInputActive(b[a].pad!, pads)));
}

/** "Press a button or move an axis": remembers what was already held, then waits for something new. */
export type Capture = {
  rest: Map<string, { buttons: boolean[]; axes: number[] }>;
  peak: { pad: string; axis: number; value: number; rest: number } | null;
};

export function captureStart(pads: Pads): Capture {
  const rest = new Map<string, { buttons: boolean[]; axes: number[] }>();
  for (const g of pads) if (g) rest.set(g.id, { buttons: g.buttons.map((x) => x.pressed), axes: [...g.axes] });
  return { rest, peak: null };
}

/** A newly pressed button binds at once. An axis binds when it swings more than half its travel and comes back,
 *  so a stick is caught at full deflection and a hat at its position. */
export function captureStep(c: Capture, pads: Pads): PadInput | null {
  for (const g of pads) {
    if (!g) continue;
    // Browsers only reveal a joystick once one of its buttons is pressed: that press counts, its axes are at rest
    if (!c.rest.has(g.id)) c.rest.set(g.id, { buttons: [], axes: [...g.axes] });
    const rest = c.rest.get(g.id)!;
    const button = g.buttons.findIndex((x, i) => x.pressed && !rest.buttons[i]);
    if (button >= 0) return { pad: g.id, button };
    g.axes.forEach((v, axis) => {
      const r = rest.axes[axis] ?? 0;
      const far = Math.abs(v - r);
      if (far > 0.5 && (!c.peak || (c.peak.pad === g.id && c.peak.axis === axis && far > Math.abs(c.peak.value - r)))) {
        c.peak = { pad: g.id, axis, value: v, rest: r };
      }
    });
  }
  const p = c.peak;
  const now = p && pads.find((g) => g?.id === p.pad)?.axes[p.axis];
  if (!p || now === undefined || now === null || Math.abs(now - p.rest) > 0.2) return null;
  const value = Math.abs(p.value) > 0.9 && Math.abs(p.value) <= 1.05 ? Math.sign(p.value) : Math.round(p.value * 100) / 100;
  return { pad: p.pad, axis: p.axis, value };
}

export function padLabel(p: PadInput) {
  const name = p.pad.split(' (')[0];
  const dev = name.length > 16 ? `${name.slice(0, 16).trimEnd()}…` : name;
  if ('button' in p) return `${dev} B${p.button + 1}`;
  const pos = Math.abs(p.value) === 1 ? (p.value > 0 ? '+' : '−') : ` ${p.value.toFixed(2).replace('-', '−')}`;
  return `${dev} A${p.axis + 1}${pos}`;
}

function validPad(p: unknown): p is PadInput {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  const int = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;
  return typeof o.pad === 'string' && (int(o.button) || (int(o.axis) && typeof o.value === 'number'));
}

/** Stored JSON → bindings; anything missing or malformed keeps its default. */
export function parseBindings(json: string | null): Bindings {
  const b = defaultBindings();
  try {
    const v: unknown = JSON.parse(json ?? '{}');
    if (!v || typeof v !== 'object') return b;
    for (const a of ACTIONS) {
      const s = (v as Record<string, { key?: unknown; pad?: unknown }>)[a];
      if (!s || typeof s !== 'object') continue;
      if (typeof s.key === 'string' || s.key === null) b[a].key = s.key;
      if (s.pad === null || validPad(s.pad)) b[a].pad = s.pad;
    }
  } catch {
    // corrupt storage: defaults
  }
  return b;
}

// Browser store (localStorage, every access guarded), read through useSyncExternalStore.
let cache: Bindings | null = null;
export const DEFAULT_BINDINGS = defaultBindings();

export function getBindings(): Bindings {
  if (cache) return cache;
  try {
    cache = parseBindings(localStorage.getItem(STORE));
  } catch {
    cache = defaultBindings(); // storage blocked: defaults for this visit
  }
  return cache;
}

export function saveBindings(b: Bindings) {
  cache = b;
  try {
    localStorage.setItem(STORE, JSON.stringify(b));
  } catch {
    // storage unavailable: the change lasts until reload
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeBindings(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORE) return;
    cache = null; // another tab changed them
    cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
