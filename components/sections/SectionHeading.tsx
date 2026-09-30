import type { ReactNode } from 'react';

/** Small letter-spaced label, the DDI look, used above headings and on table captions. */
export const eyebrow = 'font-mono text-xs tracking-[0.3em] text-ink/75';

/** A section title: the phosphor label on top, then the heading proper. */
export function SectionHeading({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold leading-tight text-ink">
      <span className="mb-2 block font-mono text-xs font-normal tracking-[0.35em] text-phosphor">{label}</span>
      {children}
    </h2>
  );
}
