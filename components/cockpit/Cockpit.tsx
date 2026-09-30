'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Mode, Power, Sim } from '@/lib/sim/types';
import { SIM_DT } from '@/lib/sim/constants';
import { createSim, step } from '@/lib/sim/sim';
import { makeTarget } from '@/lib/sim/world';
import { castle, castlePress, setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
import { pushbuttons, type Pushbutton } from '@/lib/sim/pushbuttons';
import type { Difficulty } from '@/lib/sim/encounters';
import { createFreePlay, freePlayStatus, stepFreePlay, type FreePlay } from '@/lib/sim/freeplay';
import { drawDdi } from '@/lib/ddi/draw';
import { drawHud } from '@/lib/ddi/hud';
import { drawInstructor } from '@/lib/ddi/instructor';
import { ACT } from '@/lib/keys';
import { getBindings, padActions } from '@/lib/bindings';
import { LESSONS } from '@/lib/lessons/lessons';
import { advance, isComplete, type Lesson } from '@/lib/lessons/lesson';
import { markLessonDone, markTutorialSeen, tutorialSeen } from '@/lib/progress';
import { START_EVENT, type StartRequest } from '@/lib/bus';
import { fitCanvas } from './canvas';
import { useKeyboard } from './useKeyboard';
import { Ddi } from './Ddi';
import { ThrottleGrip } from './ThrottleGrip';
import { StickGrip } from './StickGrip';
import { RadarKnob } from './RadarKnob';
import { FlightStrip } from './FlightStrip';
import { HudWindow } from './HudWindow';
import { InstructorMap } from './InstructorMap';
import { LessonStrip, SpotDim } from './LessonStrip';
import { WelcomeDialog } from './WelcomeDialog';

/** A fixed practice scenario: two bandits and a friendly, no objectives. */
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

type Activity =
  | { kind: 'sandbox' }
  | { kind: 'lesson'; lesson: Lesson; index: number }
  | { kind: 'freeplay'; difficulty: Difficulty };

type View = {
  pbs: Record<number, Pushbutton>;
  hdg: number;
  alt: number;
  spd: number;
  power: Power;
  mode: Mode;
  mark: { u: number; v: number } | null;
  status: string;
  score: number | null;
};

const viewOf = (sim: Sim, act: Activity, fp: FreePlay | null): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
  mode: sim.radar.mode,
  mark: act.kind === 'lesson' ? (act.lesson.steps[act.index]?.mark?.(sim) ?? null) : null,
  status: fp ? freePlayStatus(sim, fp) : '',
  score: fp ? fp.score : null,
});

/** Edge-triggered HOTAS actions; continuous controls go through applyHeld. */
const ACTIONS: Record<string, (sim: Sim) => void> = {
  [ACT.designate]: tdcDepress,
  [ACT.undesignate]: undesignate,
  [ACT.castlePress]: castlePress,
  [ACT.castleFwd]: (s) => castle(s, 'fwd'),
  [ACT.castleAft]: (s) => castle(s, 'aft'),
  [ACT.castleLeft]: (s) => castle(s, 'left'),
  [ACT.castleRight]: (s) => castle(s, 'right'),
};

function applyHeld(sim: Sim, pressed: ReadonlySet<string>) {
  const k = (code: string) => (pressed.has(code) ? 1 : 0);
  sim.held.tdcX = k(ACT.tdcRight) - k(ACT.tdcLeft);
  sim.held.tdcY = k(ACT.tdcUp) - k(ACT.tdcDown);
  sim.held.elev = k(ACT.elevUp) - k(ACT.elevDown);
  sim.held.turn = k(ACT.turnRight) - k(ACT.turnLeft);
  sim.held.fine = pressed.has(ACT.fine);
  sim.held.climb = k(ACT.noseUp) - k(ACT.noseDown);
  sim.held.accel = k(ACT.faster) - k(ACT.slower);
}

const noSubscribe = () => () => {};

export function Cockpit() {
  const [initial] = useState(() => {
    const sim = sandbox();
    const act: Activity = { kind: 'sandbox' };
    return { sim, act, view: viewOf(sim, act, null) };
  });
  const simRef = useRef(initial.sim);
  const fpRef = useRef<FreePlay | null>(null);
  const activityRef = useRef<Activity>(initial.act);
  const lastRequestRef = useRef<StartRequest>({ kind: 'sandbox' });
  const [activity, setActivity] = useState<Activity>(initial.act);
  const [view, setView] = useState(initial.view);
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); // welcome dialog reopened from the header "?" button
  // server snapshot: false (no dialog in the static HTML); client: open on a first visit
  const firstVisit = useSyncExternalStore(noSubscribe, () => !tutorialSeen(), () => false);
  const seenRef = useRef(0); // how far into sim.events the announcer has read
  const pressedRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => setView(viewOf(simRef.current, activityRef.current, fpRef.current)), []);
  const goTo = useCallback((next: Activity) => {
    activityRef.current = next;
    setActivity(next);
    if (next.kind === 'lesson' && isComplete(next.lesson, next.index)) markLessonDone(next.lesson.id);
  }, []);
  const releaseAll = useCallback(() => {
    pressedRef.current.clear();
    setLit(new Set());
  }, []);
  const start = useCallback(
    (req: StartRequest) => {
      lastRequestRef.current = req;
      const lesson = req.kind === 'lesson' ? LESSONS.find((l) => l.id === req.id) : undefined;
      const free = req.kind === 'freeplay' ? createFreePlay(req.difficulty, Math.floor(Math.random() * 2 ** 31)) : null;
      const sim = free ? free.sim : lesson ? lesson.setup() : sandbox();
      simRef.current = sim;
      fpRef.current = free ? free.fp : null;
      seenRef.current = 0;
      releaseAll();
      pausedRef.current = false;
      setPaused(false);
      setShowMap(req.kind !== 'freeplay'); // the truth map stays off in free play
      if (lesson?.id === 'tutorial') markTutorialSeen();
      goTo(
        req.kind === 'freeplay'
          ? { kind: 'freeplay', difficulty: req.difficulty }
          : lesson
            ? { kind: 'lesson', lesson, index: 0 }
            : { kind: 'sandbox' },
      );
      setView(viewOf(sim, activityRef.current, fpRef.current));
      const text = req.kind === 'freeplay' ? `Free play: ${req.difficulty}` : lesson ? `Lesson: ${lesson.title}` : 'Sandbox';
      setAnnouncement((a) => ({ text, n: a.n + 1 }));
    },
    [goTo, releaseAll],
  );
  const nextStep = useCallback(() => {
    const act = activityRef.current;
    if (act.kind === 'lesson') goTo({ ...act, index: act.index + 1 });
    refresh();
  }, [goTo, refresh]);
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);
  const toggleMap = useCallback(() => setShowMap((m) => !m), []);
  const press = useCallback(
    (code: string) => {
      const pressed = pressedRef.current;
      if (!code || pressed.has(code)) return;
      pressed.add(code);
      if (code === ACT.pause) togglePause();
      else if (code === ACT.map) toggleMap();
      else if (!pausedRef.current) ACTIONS[code]?.(simRef.current);
      setLit(new Set(pressed));
    },
    [togglePause, toggleMap],
  );
  const release = useCallback((code: string) => {
    if (pressedRef.current.delete(code)) setLit(new Set(pressedRef.current));
  }, []);
  const pressPb = useCallback(
    (n: number) => {
      if (pausedRef.current) return;
      pushbuttons(simRef.current)[n]?.press?.();
      refresh();
    },
    [refresh],
  );
  const changePower = useCallback(
    (p: Power) => {
      if (pausedRef.current) return;
      setPower(simRef.current, p);
      refresh();
    },
    [refresh],
  );

  // Lesson cards and other page sections ask the cockpit to start things
  useEffect(() => {
    const onStart = (e: Event) => {
      start((e as CustomEvent<StartRequest>).detail);
      (document.activeElement as HTMLElement | null)?.blur(); // else Space would re-press the card instead of designating
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [start]);

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

  useKeyboard(activeRef, press, release, releaseAll);

  // Fixed-step simulation + drawing; React chrome and lesson checks run at 10 Hz.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const font = getComputedStyle(canvas).fontFamily;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastUi = 0;
    // Joystick / HOTAS: the browser has no gamepad events for buttons, so poll every frame and press what changed.
    // ponytail: keyboard and joystick share one pressed set, so letting go of either releases an action held on both.
    let padHeld = new Set<string>();
    const pollPads = () => {
      let pads: readonly (Gamepad | null)[] = [];
      try {
        pads = navigator.getGamepads?.() ?? [];
      } catch {
        // blocked (insecure context or permissions policy): keyboard only
      }
      const held = activeRef.current ? padActions(getBindings(), pads) : new Set<string>();
      for (const a of held) if (!padHeld.has(a)) press(a);
      for (const a of padHeld) if (!held.has(a)) release(a);
      padHeld = held;
    };
    const frame = (now: number) => {
      const sim = simRef.current;
      pollPads();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (activeRef.current) {
        if (!pausedRef.current) {
          applyHeld(sim, pressedRef.current);
          acc += dt;
          while (acc >= SIM_DT) {
            step(sim);
            if (fpRef.current) stepFreePlay(sim, fpRef.current);
            acc -= SIM_DT;
          }
        }
        drawDdi(ctx, sim, fitCanvas(canvas), font);
        const hud = hudRef.current;
        const hudCtx = hud?.getContext('2d');
        if (hud && hudCtx) drawHud(hudCtx, sim, fitCanvas(hud), font);
        const map = mapRef.current;
        const mapCtx = map?.getContext('2d');
        if (map && mapCtx) drawInstructor(mapCtx, sim, fitCanvas(map, 1.5), font);
      }
      if (now - lastUi > 100) {
        lastUi = now;
        const act = activityRef.current;
        if (act.kind === 'lesson') {
          const i = advance(act.lesson, act.index, sim);
          if (i !== act.index) goTo({ ...act, index: i });
        }
        setView(viewOf(sim, activityRef.current, fpRef.current));
        const fresh = sim.events.slice(seenRef.current);
        seenRef.current = sim.events.length;
        if (fresh.length) setAnnouncement((a) => ({ text: fresh.map((e) => e.text).join('. '), n: a.n + 1 }));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [goTo, press, release]);

  const showHud = view.mode === 'ACM' || view.mode === 'STT';

  // Spotlight the elements the current lesson step talks about
  const spotKey = activity.kind === 'lesson' ? (activity.lesson.steps[activity.index]?.highlight ?? []).join(' ') : '';
  const [rects, setRects] = useState<DOMRect[]>([]);
  useEffect(() => {
    if (!spotKey) return;
    const els = spotKey.split(' ').flatMap((id) => [...document.querySelectorAll<HTMLElement>(`[data-tut="${id}"]`)]);
    els.forEach((el) => el.setAttribute('data-spot', ''));
    const measure = () => setRects(els.map((el) => el.getBoundingClientRect()));
    measure();
    addEventListener('resize', measure);
    addEventListener('scroll', measure, true);
    return () => {
      els.forEach((el) => el.removeAttribute('data-spot'));
      removeEventListener('resize', measure);
      removeEventListener('scroll', measure, true);
    };
  }, [spotKey, showMap, showHud]);

  const chip = 'rounded border border-white/10 px-2 py-1 text-ink/80 hover:text-phosphor aria-pressed:text-phosphor';
  const label =
    activity.kind === 'lesson'
      ? `LESSON · ${activity.lesson.title.toUpperCase()}`
      : activity.kind === 'freeplay'
        ? `FREE PLAY · ${activity.difficulty.toUpperCase()}`
        : 'SANDBOX';

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh scroll-mt-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="truncate text-phosphor">APG-73 TRAINER · {label}</span>
        <span className="order-last min-w-0 basis-full text-center text-ink/85 sm:order-none sm:flex-1 sm:basis-0 sm:truncate">{view.status || announcement.text}</span>
        <span className="sr-only" aria-live="polite">
          {announcement.text}
          {announcement.n % 2 ? '\u200b' : ''}
        </span>
        <div className="flex max-w-full flex-wrap gap-2">
          {view.score !== null && <span className="rounded border border-phosphor/30 px-2 py-1 text-phosphor">SCORE {view.score}</span>}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => start(lastRequestRef.current)} className={chip}>
            RESTART
          </button>
          <button type="button" aria-pressed={showMap} onMouseDown={(e) => e.preventDefault()} onClick={toggleMap} className={chip}>
            MAP · M
          </button>
          <button type="button" aria-label="Welcome and tutorial" onMouseDown={(e) => e.preventDefault()} onClick={() => setHelpOpen(true)} className={chip}>
            ?
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={togglePause} className={chip}>
            {paused ? 'PAUSED · P' : 'PAUSE · P'}
          </button>
        </div>
      </header>
      <SpotDim rects={spotKey ? rects : []} />
      {activity.kind === 'lesson' && (
        <LessonStrip
          lesson={activity.lesson}
          index={activity.index}
          rects={spotKey ? rects : []}
          onNext={nextStep}
          onExit={() => start({ kind: 'sandbox' })}
          onStartLesson={(id) => start({ kind: 'lesson', id })}
        />
      )}
      <div className="grid flex-1 items-start gap-6 p-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 flex flex-col items-center gap-4 lg:order-1 lg:items-end">
          <ThrottleGrip lit={lit} press={press} release={release} />
          <RadarKnob power={view.power} onChange={changePower} />
        </div>
        <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <div className="w-[min(92vw,calc(100dvh-12rem))] lg:w-[min(52vw,calc(100dvh-12rem))]">
            <Ddi pbs={view.pbs} canvasRef={canvasRef} onPress={pressPb} mark={view.mark} />
          </div>
          <FlightStrip hdg={view.hdg} alt={view.alt} spd={view.spd} lit={lit} press={press} release={release} />
        </div>
        <div className="order-3 flex flex-col items-center gap-4 lg:items-start">
          <StickGrip lit={lit} press={press} release={release} />
          {showHud && <HudWindow canvasRef={hudRef} />}
          {showMap && <InstructorMap canvasRef={mapRef} />}
        </div>
      </div>
      <WelcomeDialog
        open={helpOpen || (firstVisit && !welcomeClosed)}
        onTutorial={() => {
          setWelcomeClosed(true);
          setHelpOpen(false);
          start({ kind: 'lesson', id: 'tutorial' });
        }}
        onSkip={() => {
          setWelcomeClosed(true);
          if (helpOpen) return setHelpOpen(false); // reopened mid-session: just close
          markTutorialSeen();
          start({ kind: 'freeplay', difficulty: 'easy' });
        }}
      />
    </section>
  );
}
