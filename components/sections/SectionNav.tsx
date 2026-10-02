const LINKS: [string, string][] = [
  ['#cockpit', '▲ COCKPIT'],
  ['#start', 'START HERE'],
  ['#how', 'HOW IT WORKS'],
  ['#controls', 'CONTROLS'],
  ['#from-dcs', 'FROM DCS'],
  ['#glossary', 'GLOSSARY'],
  ['#about', 'SOURCES'],
];

/** Sticks to the top once the cockpit scrolls away: every section, and the way back up. */
export function SectionNav() {
  return (
    <nav aria-label="Sections" className="sticky top-0 z-20 border-y border-white/5 bg-panel/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5 text-xs tracking-widest">
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <a href={href} className="block rounded px-2 py-2 text-ink/80 transition-colors hover:bg-white/5 hover:text-phosphor">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
