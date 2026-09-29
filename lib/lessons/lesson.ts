import type { Sim } from '../sim/types.ts';

export type Step = {
  text: string;
  /** `data-tut` ids to spotlight while this step is showing. */
  highlight?: string[];
  /** A point on the B-scope (tactical-region units) to ring, e.g. the brick to lock. */
  mark?: (sim: Sim) => { u: number; v: number } | null;
  /** Action step: advances once this holds. Info steps (no `until`) advance with "Next". */
  until?: (sim: Sim) => boolean;
};

export type Lesson = { id: string; title: string; summary: string; setup: () => Sim; steps: Step[] };

/** Move past the current action step once its condition holds; info steps stay put. */
export function advance(lesson: Lesson, index: number, sim: Sim): number {
  return lesson.steps[index]?.until?.(sim) ? index + 1 : index;
}

export const isComplete = (lesson: Lesson, index: number) => index >= lesson.steps.length;
