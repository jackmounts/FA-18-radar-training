'use client';

import { useEffect, type RefObject } from 'react';
import { keyCode } from '@/lib/keys';
import { actionForKey, getBindings } from '@/lib/bindings';

/** Space on a focused ordinary button (lesson Next, header chips, page buttons) presses that button, not a control. */
const onPageButton = (e: KeyboardEvent) =>
  e.code === 'Space' && e.target instanceof Element && !!e.target.closest('button:not([data-hold]), a, summary');

/** Global keyboard → press/release of the bound actions, only while the cockpit is active. */
export function useKeyboard(
  activeRef: RefObject<boolean>,
  press: (action: string) => void,
  release: (action: string) => void,
  releaseAll: () => void,
) {
  useEffect(() => {
    // physical e.code -> action, so keyup releases what keydown pressed even if the bindings changed in between
    const held = new Map<string, string>();
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current || e.ctrlKey || e.metaKey || e.altKey) return; // keep browser shortcuts
      const action = actionForKey(getBindings(), keyCode(e));
      if (!action) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
      if (onPageButton(e)) return;
      e.preventDefault();
      held.set(e.code, action);
      if (!e.repeat) press(action);
    };
    const up = (e: KeyboardEvent) => {
      // macOS sends no keyup for other keys while Meta is held: releasing Meta releases everything
      if (e.key === 'Meta') return releaseAll();
      const action = held.get(e.code);
      if (!action) return;
      held.delete(e.code);
      release(action); // always, so a key pressed before a modifier never sticks
      if (activeRef.current && !onPageButton(e) && !(e.ctrlKey || e.metaKey || e.altKey)) e.preventDefault();
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
