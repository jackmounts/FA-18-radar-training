'use client';

import { useEffect, useState } from 'react';

const LINKS: [string, string][] = [
  ['#cockpit', '▲ COCKPIT'],
  ['#start', 'START HERE'],
  ['#from-dcs', 'FROM DCS'],
  ['#how', 'HOW IT WORKS'],
  ['#controls', 'CONTROLS'],
  ['#glossary', 'GLOSSARY'],
  ['#about', 'SOURCES'],
];

/** Sticks to the top once the cockpit scrolls away: every section, and the way back up. The section under the middle of
 *  the screen is marked as the current one. */
export function SectionNav() {
  const [active, setActive] = useState('');
  useEffect(() => {
    // A zero-height band across the middle of the viewport: only the section crossing it intersects
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)),
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const [href] of LINKS) {
      const el = document.querySelector(href);
      if (el) io.observe(el);
    }
    // The footer sheet is shorter than half a screen, so the band never reaches it: at the very bottom it is current
    const onScroll = () => {
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) setActive(LINKS[LINKS.length - 1][0]);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav aria-label="Sections" className="sticky top-0 z-20 border-y border-white/5 bg-panel/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5 text-xs tracking-widest">
        {LINKS.map(([href, label]) => (
          <li key={href} className="shrink-0">
            <a
              href={href}
              aria-current={active === href ? 'location' : undefined}
              className="block rounded px-2 py-2 text-ink/80 transition-colors hover:bg-white/5 hover:text-phosphor aria-[current]:bg-phosphor/10 aria-[current]:text-phosphor"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
