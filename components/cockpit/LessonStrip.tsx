'use client';

import { isComplete, type Lesson } from '@/lib/lessons/lesson';
import { LESSONS } from '@/lib/lessons/lessons';

const btn = 'rounded-md border border-phosphor/40 px-3 py-1.5 text-xs tracking-widest text-phosphor hover:bg-phosphor/10';

const CARD_W = 320;
const CARD_H = 210; // estimate; only used to decide whether the card fits beside the target
const GAP = 16;

/** Dims the whole page except the spotlighted rects. Clicks pass through. */
export function SpotDim({ rects }: { rects: DOMRect[] }) {
  if (!rects.length) return null;
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 size-full">
      <defs>
        <mask id="spot-mask">
          <rect width="100%" height="100%" fill="white" />
          {rects.map((r, i) => (
            <rect key={i} x={r.left - 6} y={r.top - 6} width={r.width + 12} height={r.height + 12} rx="8" fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spot-mask)" />
    </svg>
  );
}

/** Where to float the coach card next to the target, or null when it won't fit (then it stays docked). */
function place(rects: DOMRect[]): { left: number; top: number } | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rects.length || vw < 1024) return null; // below lg (one column) the card is a bottom sheet
  const l = Math.min(...rects.map((r) => r.left));
  const t = Math.min(...rects.map((r) => r.top));
  const r = Math.max(...rects.map((r) => r.right));
  const b = Math.max(...rects.map((r) => r.bottom));
  if (t < 0 || b > vh) return null; // target (partly) off screen: a card beside it would be too
  const clamp = (v: number, max: number) => Math.max(8, Math.min(v, max));
  const ddi = document.querySelector('[data-tut="ddi"]')?.getBoundingClientRect();
  // The card never covers the radar screen: that is what the lesson is about.
  const free = (c: { left: number; top: number }) =>
    !ddi || c.left >= ddi.right || c.left + CARD_W <= ddi.left || c.top >= ddi.bottom || c.top + CARD_H <= ddi.top;
  const fits = [
    r + GAP + CARD_W <= vw - 8 && { left: r + GAP, top: clamp(t, vh - CARD_H - 8) },
    l - GAP - CARD_W >= 8 && { left: l - GAP - CARD_W, top: clamp(t, vh - CARD_H - 8) },
    ...[l, r - CARD_W, (ddi?.left ?? l) - GAP - CARD_W, (ddi?.right ?? l) + GAP].flatMap((x) => [
      b + GAP + CARD_H <= vh - 8 && { left: clamp(x, vw - CARD_W - 8), top: b + GAP },
      t - GAP - CARD_H >= 8 && { left: clamp(x, vw - CARD_W - 8), top: t - GAP - CARD_H },
    ]),
  ];
  return fits.find((c) => c && free(c)) || null;
}

/** Coach card: the current step, and how to move on. Floats beside its target when there is room, else docks under the status line. */
export function LessonStrip({
  lesson,
  index,
  rects,
  onNext,
  onExit,
  onStartLesson,
}: {
  lesson: Lesson;
  index: number;
  rects: DOMRect[];
  onNext: () => void;
  onExit: () => void;
  onStartLesson: (id: string) => void;
}) {
  const done = isComplete(lesson, index);
  const current = lesson.steps[index];
  const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];
  const pos = done ? null : place(rects);

  const content = (
    <>
      <span className="text-xs tracking-[0.25em] text-phosphor max-lg:tracking-[0.1em]">
        {lesson.title.toUpperCase()} · {done ? 'COMPLETE' : `${index + 1}/${lesson.steps.length}`}
      </span>
      <p aria-live="polite" className="min-w-0 flex-1 basis-80 text-sm leading-relaxed">
        {done ? 'Lesson complete. Nicely done.' : current.text}
      </p>
      <div className="flex flex-wrap gap-2">
        {!done && !current.until && (
          <button type="button" onClick={onNext} className={btn}>
            NEXT
          </button>
        )}
        {!done && current.until && <span className="self-center text-xs tracking-widest text-ink/75">DO IT TO CONTINUE</span>}
        {done && next && (
          <button type="button" onClick={() => onStartLesson(next.id)} className={btn}>
            NEXT: {next.title.toUpperCase()}
          </button>
        )}
        <button type="button" onClick={onExit} className={btn}>
          {done ? 'CLOSE' : 'EXIT'}
        </button>
      </div>
    </>
  );

  // Docked strip; when the card floats it stays in the flow as an invisible spacer so the layout (and the target) don't jump.
  // Below lg it moves to the end of the cockpit and sticks to the bottom of the screen while the cockpit is in view.
  const docked = (
    <div
      role={pos ? undefined : 'region'}
      aria-label={pos ? undefined : 'Lesson'}
      aria-hidden={pos ? true : undefined}
      data-lesson-sheet
      className={`relative z-40 mx-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-phosphor/30 bg-black/40 px-4 py-3 max-lg:sticky max-lg:bottom-0 max-lg:order-last max-lg:mx-0 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:bg-bezel max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-8px_24px_rgba(0,0,0,0.6)] ${pos ? 'invisible' : ''}`}
    >
      {content}
    </div>
  );
  if (!pos) return docked;
  return (
    <>
      {docked}
      <div
        role="region"
        aria-label="Lesson"
        style={{ left: pos.left, top: pos.top, width: CARD_W }}
        className="fixed z-50 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-phosphor/50 bg-bezel px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
      >
        {content}
      </div>
    </>
  );
}
