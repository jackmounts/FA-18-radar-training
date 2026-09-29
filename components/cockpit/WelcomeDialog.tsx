'use client';

import { useEffect, useRef } from 'react';

/** First-visit welcome: start the tutorial, or skip it (Esc also skips). */
export function WelcomeDialog({ open, onTutorial, onSkip }: { open: boolean; onTutorial: () => void; onSkip: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onSkip}
      aria-labelledby="welcome-title"
      className="m-auto max-w-md rounded-2xl border border-phosphor/30 bg-panel-2 p-6 text-ink backdrop:bg-black/70"
    >
      <h2 id="welcome-title" className="text-sm tracking-[0.3em] text-phosphor">
        WELCOME, PILOT
      </h2>
      <p className="mt-3 text-sm leading-relaxed">
        This is an interactive trainer for the F/A-18C Hornet&apos;s AN/APG-73 radar. The three-minute tutorial walks you
        through the display, the controls and your first lock.
      </p>
      <div className="mt-5 flex gap-3">
        <button type="button" autoFocus onClick={onTutorial} className="rounded-md bg-phosphor px-4 py-2 text-sm font-bold text-black">
          Start tutorial
        </button>
        <button type="button" onClick={onSkip} className="rounded-md border border-white/15 px-4 py-2 text-sm">
          Skip for now
        </button>
      </div>
    </dialog>
  );
}
