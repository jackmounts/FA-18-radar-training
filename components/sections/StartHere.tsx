'use client';

import { useSyncExternalStore } from 'react';
import { LESSONS } from '@/lib/lessons/lessons';
import { requestStart } from '@/lib/bus';
import { lessonsDone, subscribeProgress } from '@/lib/progress';
import type { Difficulty } from '@/lib/sim/encounters';

const btn = 'rounded-md border border-phosphor/40 px-4 py-2 text-sm text-phosphor hover:bg-phosphor/10';

const LEVELS: { difficulty: Difficulty; blurb: string }[] = [
  { difficulty: 'easy', blurb: 'One bandit, nose-on, at your altitude. Lock it.' },
  { difficulty: 'normal', blurb: 'A bandit among friendlies. Identify everyone, then lock the hostile.' },
  { difficulty: 'hard', blurb: 'A 2-ship that beams, friendlies in the mix, anywhere ±60° and any altitude.' },
];

export function StartHere() {
  const done = useSyncExternalStore(subscribeProgress, () => lessonsDone().join(','), () => '');
  const doneSet = new Set(done ? done.split(',') : []);
  return (
    <section id="start" aria-labelledby="start-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="start-h" className="text-xs tracking-[0.35em] text-phosphor">
        START HERE
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
        New to the Hornet&apos;s radar? Take the tutorial first. Each lesson then drills one skill in its own short scenario. When you&apos;re ready, free play sends you random encounters with an AWACS tasking, a clock and a score.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => requestStart({ kind: 'lesson', id: 'tutorial' })} className={btn}>
          {doneSet.has('tutorial') ? 'Replay the tutorial ✓' : 'Start the tutorial'}
        </button>
        <button type="button" onClick={() => requestStart({ kind: 'sandbox' })} className={btn}>
          Open the sandbox
        </button>
      </div>
      <h3 className="mt-10 text-[11px] tracking-[0.3em] text-ink/75">LESSONS</h3>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.filter((l) => l.id !== 'tutorial').map((l, i) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => requestStart({ kind: 'lesson', id: l.id })}
              className="h-full w-full rounded-xl border border-white/10 bg-panel-2 p-4 text-left hover:border-phosphor/50"
            >
              <span className="text-[11px] tracking-[0.25em] text-phosphor">
                LESSON {i + 1}
                {doneSet.has(l.id) ? ' · ✓ DONE' : ''}
              </span>
              <span className="mt-1 block font-bold">{l.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink/75">{l.summary}</span>
            </button>
          </li>
        ))}
      </ol>

      <h3 className="mt-10 text-[11px] tracking-[0.3em] text-ink/75">FREE PLAY</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {LEVELS.map(({ difficulty, blurb }) => (
          <li key={difficulty}>
            <button
              type="button"
              onClick={() => requestStart({ kind: 'freeplay', difficulty })}
              className="h-full w-full rounded-xl border border-white/10 bg-panel-2 p-4 text-left hover:border-phosphor/50"
            >
              <span className="text-[11px] tracking-[0.25em] text-phosphor">{difficulty.toUpperCase()}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink/75">{blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
