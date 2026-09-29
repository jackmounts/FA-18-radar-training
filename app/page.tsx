import { Cockpit } from '@/components/cockpit/Cockpit';

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Hornet Radar Trainer — learn the AN/APG-73 radar</h1>
      <Cockpit />
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-sm leading-relaxed">
        <h2 className="text-xs tracking-[0.35em] text-phosphor">HOW TO FLY THE SANDBOX</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Turn the RADAR knob to OPR. The vertical line sweeping across the display is the antenna.</li>
          <li>Contacts appear as small bricks: range is up the screen, azimuth left to right.</li>
          <li>
            Slew the cursor with <kbd>W A S D</kbd> over a brick and press <kbd>Space</kbd> to lock it (STT).
          </li>
          <li>
            Press <kbd>U</kbd> (undesignate) to break lock. Roll the antenna up and down with <kbd>R</kbd> / <kbd>F</kbd>.
          </li>
          <li>Fly with the arrow keys; hold Shift for fine turns. <kbd>+</kbd> / <kbd>−</kbd> change speed.</li>
        </ol>
        <p className="text-xs text-ink/60">
          Unofficial training aid built from public sources with simplified numbers. Not affiliated with the US Navy,
          Boeing, RTX or Eagle Dynamics.
        </p>
      </section>
    </main>
  );
}
