'use client';

import { LESSONS } from '@/lib/lessons/lessons';
import { requestStart } from '@/lib/bus';

/** "Try it" buttons under an explainer: start the lessons that drill it. */
export function TryIt({ lessons }: { lessons: string[] }) {
  return (
    <p className="mt-4 flex flex-wrap gap-2">
      {lessons.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => requestStart({ kind: 'lesson', id })}
          className="rounded-md border border-phosphor/40 px-3 py-1.5 text-sm text-phosphor hover:bg-phosphor/10"
        >
          Try it: {LESSONS.find((l) => l.id === id)?.title} →
        </button>
      ))}
    </p>
  );
}
