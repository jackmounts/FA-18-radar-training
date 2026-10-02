'use client';

import { useSyncExternalStore } from 'react';
import { keyLabel, type Action } from '@/lib/keys';
import { DEFAULT_BINDINGS, getBindings, subscribeBindings } from '@/lib/bindings';

/** The current key/joystick bindings; the static HTML shows the defaults. */
export const useBindings = () => useSyncExternalStore(subscribeBindings, getBindings, () => DEFAULT_BINDINGS);

/** Label of the key bound to an action ('—' when unbound). */
export function useKeyLabel(action: string) {
  const key = useBindings()[action as Action]?.key;
  return key ? keyLabel(key) : '—';
}

export type HoldButtonProps = {
  code: string;
  label: string;
  lit: boolean;
  press: (code: string) => void;
  release: (code: string) => void;
  disabled?: boolean;
};

export type GripProps = Pick<HoldButtonProps, 'press' | 'release'> & { lit: ReadonlySet<string> };

/** A control that behaves exactly like its key: pressed while held, lit (and aria-pressed) while pressed. */
export function HoldButton({ code, label, lit, press, release, disabled }: HoldButtonProps) {
  const key = useKeyLabel(code);
  return (
    <button
      type="button"
      data-hold=""
      disabled={disabled}
      aria-pressed={disabled ? undefined : lit}
      title={disabled ? 'Not simulated yet' : undefined}
      aria-label={disabled ? `${label} (not simulated yet)` : `${label} (key ${key})`}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        press(code);
      }}
      onPointerUp={() => release(code)}
      onPointerCancel={() => release(code)}
      onLostPointerCapture={() => release(code)}
      onClick={(e) => {
        if (e.detail === 0) {
          press(code); // keyboard activation: hold ~150 ms so continuous controls reach applyHeld
          setTimeout(() => release(code), 150);
        }
      }}
      className={`flex min-h-11 touch-none select-none flex-col items-center justify-center rounded-md border px-2 py-1 text-xs leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        lit ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink hover:brightness-110'
      }`}
    >
      <span>{label}</span>
      {code && <kbd className="text-xs text-ink/75 pointer-coarse:hidden">{key}</kbd>}
    </button>
  );
}
