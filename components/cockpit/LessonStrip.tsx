'use client';

import { isComplete, type Lesson } from '@/lib/lessons/lesson';
import { LESSONS } from '@/lib/lessons/lessons';

const btn = 'rounded-md border border-phosphor/40 px-3 py-1.5 text-xs tracking-widest text-phosphor hover:bg-phosphor/10';

/** Coach strip under the status line: the current step, and how to move on. */
export function LessonStrip({
  lesson,
  index,
  onNext,
  onExit,
  onStartLesson,
}: {
  lesson: Lesson;
  index: number;
  onNext: () => void;
  onExit: () => void;
  onStartLesson: (id: string) => void;
}) {
  const done = isComplete(lesson, index);
  const current = lesson.steps[index];
  const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];
  return (
    <div
      role="region"
      aria-label="Lesson"
      className="mx-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-phosphor/30 bg-black/40 px-4 py-3"
    >
      <span className="text-[11px] tracking-[0.25em] text-phosphor">
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
        {!done && current.until && <span className="self-center text-[11px] tracking-widest text-ink/70">DO IT TO CONTINUE</span>}
        {done && next && (
          <button type="button" onClick={() => onStartLesson(next.id)} className={btn}>
            NEXT: {next.title.toUpperCase()}
          </button>
        )}
        <button type="button" onClick={onExit} className={btn}>
          {done ? 'CLOSE' : 'EXIT'}
        </button>
      </div>
    </div>
  );
}
