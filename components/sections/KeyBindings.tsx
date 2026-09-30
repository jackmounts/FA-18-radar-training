'use client';

import { useEffect, useState } from 'react';
import { keyCode, keyLabel, type Action } from '@/lib/keys';
import { assign, captureStart, captureStep, defaultBindings, getBindings, padLabel, saveBindings } from '@/lib/bindings';
import { useBindings } from '@/components/cockpit/HoldButton';

const th = 'px-2 py-1.5 text-left text-xs font-normal text-ink/70';
const td = 'border-t border-white/5 px-2 py-1.5 align-top';

const GROUPS: [string, [Action, string, string][]][] = [
  [
    'HOTAS',
    [
      ['tdcUp', 'TDC up', 'Move the cursor. Push it into the top or bottom edge to change range, a side edge to change azimuth.'],
      ['tdcDown', 'TDC down', ''],
      ['tdcLeft', 'TDC left', ''],
      ['tdcRight', 'TDC right', ''],
      ['designate', 'TDC depress', 'Designate: trackfile (or, with LTWS, a brick) → ★, then ◇; ★ → lock; brick with LTWS off → lock; empty space → move the scan centre'],
      ['elevUp', 'Antenna elevation up', 'Raise all bars together'],
      ['elevDown', 'Antenna elevation down', 'Lower all bars together'],
      ['castleFwd', 'Castle forward', 'ACM Boresight'],
      ['castleAft', 'Castle aft', 'In ACM: Vertical acquisition'],
      ['castleLeft', 'Castle left', 'In ACM: Wide acquisition'],
      ['castleRight', 'Castle right', 'Take the TDC (the diamond); then lock what is under the cursor, else the ★, else the #1 trackfile (AACQ)'],
      ['castlePress', 'Castle press', 'IFF interrogation of the contact under the cursor'],
      ['undesignate', 'Undesignate', 'Break lock / leave ACM; in RWS and TWS: make #1 the ★, swap ★ ◇, or step ★ through the ranks'],
    ],
  ],
  [
    'FLYING AND THE PAGE',
    [
      ['turnLeft', 'Turn left', ''],
      ['turnRight', 'Turn right', ''],
      ['fine', 'Fine turn', 'Hold while turning for small corrections'],
      ['noseDown', 'Nose down', 'Descend'],
      ['noseUp', 'Nose up', 'Climb'],
      ['faster', 'Faster', ''],
      ['slower', 'Slower', ''],
      ['pause', 'Pause', ''],
      ['map', 'Instructor map', 'On / off'],
    ],
  ],
];

type Slot = 'key' | 'pad';
const MODIFIERS = new Set(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

function gamepads() {
  try {
    return navigator.getGamepads?.() ?? [];
  } catch {
    return []; // blocked: insecure context or permissions policy
  }
}

/** Every control, bindable to one key and one joystick input: click a slot, then press what you want. */
export function KeyBindings() {
  const bindings = useBindings();
  const [cap, setCap] = useState<{ action: Action; slot: Slot } | null>(null);

  useEffect(() => {
    if (!cap) return;
    const set = (slot: { key: string | null } | { pad: null }) => {
      saveBindings(assign(getBindings(), cap.action, slot));
      setCap(null);
    };
    // capture phase, stopped: while listening, keys reach neither the cockpit nor the page
    const down = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat || MODIFIERS.has(e.code)) return;
      if (e.key === 'Escape' || e.code === 'Tab') return setCap(null);
      if (e.code === 'Backspace' || e.code === 'Delete') return set(cap.slot === 'key' ? { key: null } : { pad: null });
      if (cap.slot === 'key') set({ key: keyCode(e) });
    };
    window.addEventListener('keydown', down, true);
    let raf = 0;
    if (cap.slot === 'pad') {
      const c = captureStart(gamepads());
      const poll = () => {
        const got = captureStep(c, gamepads());
        if (got) {
          saveBindings(assign(getBindings(), cap.action, { pad: got }));
          return setCap(null);
        }
        raf = requestAnimationFrame(poll);
      };
      raf = requestAnimationFrame(poll);
    }
    return () => {
      window.removeEventListener('keydown', down, true);
      cancelAnimationFrame(raf);
    };
  }, [cap]);

  const slot = (action: Action, control: string, kind: Slot) => {
    const listening = cap?.action === action && cap.slot === kind;
    const b = bindings[action];
    const value = kind === 'key' ? (b.key ? keyLabel(b.key) : '—') : b.pad ? padLabel(b.pad) : '—';
    const what = kind === 'key' ? 'key' : 'joystick input';
    return (
      <button
        type="button"
        aria-pressed={listening}
        aria-label={listening ? `${control}: press a ${what}, Escape to cancel` : `${control} ${what}: ${value}. Change`}
        title={kind === 'pad' && b.pad ? b.pad.pad : undefined}
        onClick={() => setCap(listening ? null : { action, slot: kind })}
        className={`min-h-9 w-full rounded border px-2 py-1 text-left text-xs ${
          listening ? 'animate-pulse border-phosphor/70 bg-phosphor/15 text-phosphor' : 'border-white/10 bg-button text-phosphor hover:brightness-110'
        }`}
      >
        {listening ? (kind === 'key' ? 'Press a key…' : 'Press a button or move an axis…') : <kbd>{value}</kbd>}
      </button>
    );
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-2xl text-sm leading-relaxed text-ink/80">
          Every control takes one key and one joystick or HOTAS input. Click a slot, then press the key, or press the joystick
          button, or push the axis or hat switch and let it go. Esc cancels, Backspace clears the slot. The cockpit ignores
          your inputs while this window is open.
        </p>
        <button
          type="button"
          onClick={() => saveBindings(defaultBindings())}
          className="rounded border border-white/10 px-2 py-1 text-xs text-ink/80 hover:text-phosphor"
        >
          RESET TO DEFAULTS
        </button>
      </div>
      <div className="mt-4 grid gap-10 lg:grid-cols-2">
        {GROUPS.map(([title, rows]) => (
          <div key={title} className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">{title}</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Control</th>
                  <th scope="col" className={`${th} w-24`}>Keyboard</th>
                  <th scope="col" className={`${th} w-40`}>Joystick / HOTAS</th>
                  <th scope="col" className={th}>What it does</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([action, control, what]) => (
                  <tr key={action}>
                    <th scope="row" className={`${td} text-left font-normal`}>{control}</th>
                    <td className={td}>{slot(action, control, 'key')}</td>
                    <td className={td}>{slot(action, control, 'pad')}</td>
                    <td className={`${td} text-ink/80`}>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink/60">
        Bindings are saved in this browser. A joystick shows up once you press one of its buttons on this page, and only over
        HTTPS or on localhost. Keys work while the cockpit fills at least half the screen, so Space still scrolls the page
        further down. Every on-screen control can also be clicked or tapped.
      </p>
    </div>
  );
}
