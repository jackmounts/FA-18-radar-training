import type { Held, Kinematics, Ownship, Target } from './types.ts';
import {
  ACCEL_KTPS, CLIMB_FPS, FINE_TURN_RATE_DPS, MAX_ALT_FT, MAX_SPD_KT, MIN_ALT_FT, MIN_SPD_KT,
  TARGET_CLIMB_FPS, TARGET_TURN_DPS, TURN_RATE_DPS,
} from './constants.ts';
import { bearing, clamp, rad, wrap180, wrap360 } from './geometry.ts';

export function moveMover(m: Kinematics, dt: number) {
  m.x += (m.spd * Math.sin(rad(m.hdg)) * dt) / 3600;
  m.y += (m.spd * Math.cos(rad(m.hdg)) * dt) / 3600;
}

export function stepOwnship(own: Ownship, held: Held, dt: number) {
  const rate = held.fine ? FINE_TURN_RATE_DPS : TURN_RATE_DPS;
  own.hdg = wrap360(own.hdg + held.turn * rate * dt);
  own.alt = clamp(own.alt + held.climb * CLIMB_FPS * dt, MIN_ALT_FT, MAX_ALT_FT);
  own.spd = clamp(own.spd + held.accel * ACCEL_KTPS * dt, MIN_SPD_KT, MAX_SPD_KT);
  moveMover(own, dt);
}

function turnToward(t: Kinematics, hdg: number, dt: number) {
  const d = wrap180(hdg - t.hdg);
  const s = TARGET_TURN_DPS * dt;
  if (Math.abs(d) <= s) {
    t.hdg = wrap360(hdg);
    return true;
  }
  t.hdg = wrap360(t.hdg + Math.sign(d) * s);
  return false;
}

export function stepTarget(t: Target, own: Ownship, dt: number) {
  const leg = t.legs[0];
  if (leg) {
    t.legTime += dt;
    let done: boolean;
    if (leg.kind === 'straight') done = t.legTime >= leg.seconds;
    else if (leg.kind === 'turnTo') done = turnToward(t, leg.hdg, dt);
    else if (leg.kind === 'climbTo') {
      const d = leg.alt - t.alt;
      const s = TARGET_CLIMB_FPS * dt;
      t.alt = Math.abs(d) <= s ? leg.alt : t.alt + Math.sign(d) * s;
      done = t.alt === leg.alt;
    } else {
      // beam: keep the line of sight to us on the wing, the side needing the smaller turn
      const los = bearing(t, own);
      const a = wrap360(los + 90);
      const b = wrap360(los - 90);
      turnToward(t, Math.abs(wrap180(a - t.hdg)) < Math.abs(wrap180(b - t.hdg)) ? a : b, dt);
      done = t.legTime >= leg.seconds;
    }
    if (done) {
      t.legs.shift();
      t.legTime = 0;
    }
  }
  moveMover(t, dt);
}

export function makeTarget(p: Partial<Target> & Pick<Target, 'id' | 'x' | 'y'>): Target {
  return {
    type: 'MIG-29', rcs: 5, side: 'hostile', iffReplies: false,
    alt: 20000, hdg: 180, spd: 450, legs: [], legTime: 0, ident: 'unknown',
    ...p,
  };
}
