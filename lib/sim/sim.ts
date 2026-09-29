import type { Ownship, Sim, Target } from './types.ts';
import { SIM_DT } from './constants.ts';
import { stepOwnship, stepTarget } from './world.ts';
import { defaultRadar, stepCursor, stepRadar } from './radar.ts';

/** Small seeded PRNG so lessons and tests are repeatable. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(opts: { seed?: number; own?: Partial<Ownship>; targets?: Target[] } = {}): Sim {
  return {
    t: 0,
    own: { x: 0, y: 0, alt: 20000, hdg: 0, spd: 450, ...opts.own },
    targets: opts.targets ?? [],
    radar: defaultRadar(),
    held: { tdcX: 0, tdcY: 0, elev: 0, turn: 0, fine: false, climb: 0, accel: 0 },
    rand: mulberry32(opts.seed ?? 1),
    events: [],
  };
}

export function step(sim: Sim, dt = SIM_DT) {
  sim.t += dt;
  stepOwnship(sim.own, sim.held, dt);
  for (const t of sim.targets) stepTarget(t, sim.own, dt);
  stepCursor(sim, dt);
  stepRadar(sim, dt);
}

export function run(sim: Sim, seconds: number) {
  const n = Math.round(seconds / SIM_DT);
  for (let i = 0; i < n; i++) step(sim);
}
