import type { ReactNode } from 'react';

/** Small letter-spaced label, the DDI look, for sub-headings and table captions. */
export const eyebrow = 'font-mono text-xs tracking-[0.3em] text-ink/75';

/** A section title. The section nav already names each section, so the heading says what it teaches. */
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-3xl font-bold leading-tight text-ink">
      {children}
    </h2>
  );
}
