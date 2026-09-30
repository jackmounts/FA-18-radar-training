'use client';

import { useEffect, type RefObject } from 'react';
import { KEYS } from '@/lib/keys';

const HANDLED = new Set<string>(Object.values(KEYS));

/** Global keyboard → press/release of logical key codes, only while the cockpit is active. */
export function useKeyboard(
  activeRef: RefObject<boolean>,
  press: (code: string) => void,
  release: (code: string) => void,
  releaseAll: () => void,
) {
  useEffect(() => {
    // physical e.code -> logical code, so keyup releases what keydown pressed (+/- work on any layout)
    const logical = new Map<string, string>();
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current || e.ctrlKey || e.metaKey || e.altKey) return; // keep browser shortcuts
      const code = e.key === '+' ? KEYS.faster : e.key === '-' ? KEYS.slower : e.code;
      if (!HANDLED.has(code) && !code.startsWith('Shift')) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Space on a focused ordinary button (lesson Next, header chips, page buttons) should press that button, not designate
      if (code === KEYS.designate && e.target instanceof Element && e.target.closest('button:not([data-hold]), a, summary')) return;
      if (HANDLED.has(code)) e.preventDefault();
      logical.set(e.code, code);
      if (!e.repeat) press(code);
    };
    const up = (e: KeyboardEvent) => {
      // macOS sends no keyup for other keys while Meta is held: releasing Meta releases everything
      if (e.key === 'Meta') return releaseAll();
      const code = logical.get(e.code) ?? e.code;
      logical.delete(e.code);
      release(code); // always, so a key pressed before a modifier never sticks
      const onButton = code === KEYS.designate && e.target instanceof Element && e.target.closest('button:not([data-hold]), a, summary');
      if (HANDLED.has(code) && activeRef.current && !onButton && !(e.ctrlKey || e.metaKey || e.altKey)) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
    };
  }, [activeRef, press, release, releaseAll]);
}
