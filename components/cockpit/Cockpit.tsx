'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Power, Sim } from '@/lib/sim/types';
import { SIM_DT } from '@/lib/sim/constants';
import { createSim, step } from '@/lib/sim/sim';
import { makeTarget } from '@/lib/sim/world';
import { setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
import { pushbuttons, type Pushbutton } from '@/lib/sim/pushbuttons';
import { drawDdi } from '@/lib/ddi/draw';
import { KEYS } from '@/lib/keys';
import { Ddi } from './Ddi';
import { ThrottleGrip } from './ThrottleGrip';
import { StickGrip } from './StickGrip';
import { RadarKnob } from './RadarKnob';
import { FlightStrip } from './FlightStrip';

// ponytail: fixed sandbox until free-play encounters land in Plan 5
function sandbox(): Sim {
  return createSim({
    seed: 1,
    targets: [
      makeTarget({ id: 'T1', x: -8, y: 34, alt: 25000, hdg: 170, spd: 450 }),
      makeTarget({
        id: 'T2', type: 'F-16', side: 'friendly', iffReplies: true, x: 20, y: 40, alt: 15000, hdg: 250, spd: 420,
        legs: [{ kind: 'straight', seconds: 60 }, { kind: 'turnTo', hdg: 160 }],
      }),
      makeTarget({ id: 'T3', type: 'SU-27', rcs: 15, x: 3, y: 28, alt: 38000, hdg: 200, spd: 500 }),
    ],
  });
}

type View = { pbs: Record<number, Pushbutton>; hdg: number; alt: number; spd: number; power: Power };

const viewOf = (sim: Sim): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
});

const HANDLED = new Set<string>(Object.values(KEYS));

function applyHeld(sim: Sim, pressed: ReadonlySet<string>) {
  const k = (code: string) => (pressed.has(code) ? 1 : 0);
  sim.held.tdcX = k(KEYS.tdcRight) - k(KEYS.tdcLeft);
  sim.held.tdcY = k(KEYS.tdcUp) - k(KEYS.tdcDown);
  sim.held.elev = k(KEYS.elevUp) - k(KEYS.elevDown);
  sim.held.turn = k(KEYS.turnRight) - k(KEYS.turnLeft);
  sim.held.fine = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
  sim.held.climb = k(KEYS.noseUp) - k(KEYS.noseDown);
  sim.held.accel = k(KEYS.faster) - k(KEYS.slower);
}

export function Cockpit() {
  const [initial] = useState(() => {
    const sim = sandbox();
    return { sim, view: viewOf(sim) };
  });
  const simRef = useRef(initial.sim);
  const [view, setView] = useState(initial.view);
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const pressedRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => setView(viewOf(simRef.current)), []);
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);
  const press = useCallback(
    (code: string) => {
      const pressed = pressedRef.current;
      if (!code || pressed.has(code)) return;
      pressed.add(code);
      const sim = simRef.current;
      if (code === KEYS.designate) tdcDepress(sim);
      else if (code === KEYS.undesignate) undesignate(sim);
      else if (code === KEYS.pause) togglePause();
      setLit(new Set(pressed));
    },
    [togglePause],
  );
  const release = useCallback((code: string) => {
    if (pressedRef.current.delete(code)) setLit(new Set(pressedRef.current));
  }, []);
  const releaseAll = useCallback(() => {
    pressedRef.current.clear();
    setLit(new Set());
  }, []);
  const changePower = useCallback(
    (p: Power) => {
      setPower(simRef.current, p);
      refresh();
    },
    [refresh],
  );

  // Keys and the sim run only while at least half of the cockpit (or half the viewport) is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const need = 0.5 * Math.min(e.boundingClientRect.height, window.innerHeight);
        activeRef.current = e.intersectionRect.height >= need;
        if (!activeRef.current) releaseAll();
      },
      { threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [releaseAll]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (!HANDLED.has(e.code) && !e.code.startsWith('Shift')) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      if (HANDLED.has(e.code)) e.preventDefault();
      if (!e.repeat) press(e.code);
    };
    const up = (e: KeyboardEvent) => {
      if (HANDLED.has(e.code) && activeRef.current) e.preventDefault();
      release(e.code);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
    };
  }, [press, release, releaseAll]);

  // Fixed-step simulation + drawing; React chrome refreshes at 10 Hz.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const font = getComputedStyle(canvas).fontFamily;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastUi = 0;
    const frame = (now: number) => {
      const sim = simRef.current;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (activeRef.current && !pausedRef.current) {
        applyHeld(sim, pressedRef.current);
        acc += dt;
        while (acc >= SIM_DT) {
          step(sim);
          acc -= SIM_DT;
        }
      }
      const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      drawDdi(ctx, sim, size, font);
      if (now - lastUi > 100) {
        lastUi = now;
        setView(viewOf(sim));
        const msg = sim.events.splice(0).at(-1);
        if (msg) setAnnouncement(msg);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="text-phosphor">APG-73 TRAINER · SANDBOX</span>
        <span aria-live="polite" className="truncate text-ink/80">
          {announcement}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={togglePause}
          className="rounded border border-white/10 px-2 py-1 text-ink/80 hover:text-phosphor"
        >
          {paused ? 'PAUSED · P' : 'PAUSE · P'}
        </button>
      </header>
      <div className="grid flex-1 items-center gap-6 p-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 flex flex-col items-center gap-4 lg:order-1 lg:items-end">
          <ThrottleGrip lit={lit} press={press} release={release} />
          <RadarKnob power={view.power} onChange={changePower} />
        </div>
        <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <div className="w-[min(92vw,calc(100dvh-10rem))] lg:w-[min(52vw,calc(100dvh-10rem))]">
            <Ddi pbs={view.pbs} canvasRef={canvasRef} onChange={refresh} />
          </div>
          <FlightStrip hdg={view.hdg} alt={view.alt} spd={view.spd} lit={lit} press={press} release={release} />
        </div>
        <div className="order-3 flex flex-col items-center gap-4 lg:items-start">
          <StickGrip lit={lit} press={press} release={release} />
        </div>
      </div>
    </section>
  );
}
