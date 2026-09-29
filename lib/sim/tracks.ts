import type { Kinematics, Radar, Sim, Target, Track } from './types.ts';
import { MAX_TRACKS, TRACK_MIN_COAST_S } from './constants.ts';
import { frameTime } from './antenna.ts';
import { range, velocity } from './geometry.ts';

/** How long a trackfile survives without a new detection. */
export const trackCoast = (r: Pick<Radar, 'azWidth' | 'bars'>) =>
  Math.max(TRACK_MIN_COAST_S, 2.5 * frameTime(r.azWidth, r.bars));

/** Record a detection: the trackfile becomes a snapshot of the target now.
 *  ponytail: no Kalman filter; add one only if tracks look wrong. */
export function updateTrack(r: Radar, t: Target, now: number) {
  const snap: Track = { targetId: t.id, x: t.x, y: t.y, alt: t.alt, hdg: t.hdg, spd: t.spd, t: now, rank: 0 };
  const i = r.tracks.findIndex((tr) => tr.targetId === t.id);
  if (i >= 0) r.tracks[i] = { ...snap, rank: r.tracks[i].rank };
  else if (r.tracks.length < MAX_TRACKS) r.tracks.push(snap);
}

/** Where the trackfile says the target is now (dead-reckoned from the last detection). */
export function trackAt(tr: Track, now: number): Kinematics {
  const { vx, vy } = velocity(tr);
  const dt = now - tr.t;
  return { x: tr.x + (vx * dt) / 3600, y: tr.y + (vy * dt) / 3600, alt: tr.alt, hdg: tr.hdg, spd: tr.spd };
}

/** Drop trackfiles not refreshed within the coast time (never the STT target), and designations that lost their track. */
export function pruneTracks(sim: Sim) {
  const r = sim.radar;
  const coast = trackCoast(r);
  r.tracks = r.tracks.filter((tr) => sim.t - tr.t <= coast || tr.targetId === r.stt?.targetId);
  const alive = (id: string | null) => id !== null && r.tracks.some((tr) => tr.targetId === id);
  if (!alive(r.ls)) r.ls = null;
  if (!alive(r.dt2)) r.dt2 = null;
}

/** Rank 1 = closest trackfile (ponytail: range-only threat ranking). */
export function rankTracks(sim: Sim) {
  const d = (tr: Track) => range(sim.own, trackAt(tr, sim.t));
  [...sim.radar.tracks].sort((a, b) => d(a) - d(b)).forEach((tr, i) => {
    tr.rank = i + 1;
  });
}
