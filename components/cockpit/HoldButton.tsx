'use client';

import { keyLabel } from '@/lib/keys';

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
  return (
    <button
      type="button"
      data-hold=""
      disabled={disabled}
      aria-pressed={disabled ? undefined : lit}
      title={disabled ? 'Not simulated yet' : undefined}
      aria-label={disabled ? `${label} (not simulated yet)` : `${label} (key ${keyLabel(code)})`}
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
      className={`flex min-h-11 touch-none select-none flex-col items-center justify-center rounded-md border px-2 py-1 text-[11px] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        lit ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink hover:brightness-110'
      }`}
    >
      <span>{label}</span>
      {code && <kbd className="text-[10px] text-ink/70">{keyLabel(code)}</kbd>}
    </button>
  );
}
