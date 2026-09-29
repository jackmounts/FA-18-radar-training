import type { Ident, Sim, Target } from './types.ts';
import { IFF_HALF_WIDTH_DEG, NCTR_MAX_ASPECT_DEG, NCTR_MAX_RANGE_NM, NCTR_TIME_S } from './constants.ts';
import { aspect, range, relAz } from './geometry.ts';
import { trackAt } from './tracks.ts';

const WORD: Record<Ident, string> = { unknown: 'UNKNOWN', ambiguous: 'AMBIGUOUS', friendly: 'FRIENDLY', hostile: 'HOSTILE' };

// ponytail: identity lives on the target, not the trackfile; revisit if datalink is added
function setIdent(sim: Sim, t: Target, ident: Ident) {
  if (t.ident === ident) return;
  t.ident = ident;
  sim.events.push({ kind: 'ident', targetId: t.id, ident, text: `Contact ${Math.round(range(sim.own, t))} nm: ${WORD[ident]}` });
}

/** IFF: a reply means friendly, silence means ambiguous (it never downgrades a hostile). */
export function iff(sim: Sim, t: Target) {
  setIdent(sim, t, t.iffReplies ? 'friendly' : t.ident === 'hostile' ? 'hostile' : 'ambiguous');
}

/** One IFF scan, 22° wide, centred on the given trackfile: interrogates every trackfile inside it. */
export function interrogate(sim: Sim, targetId: string) {
  const tracks = sim.radar.tracks;
  const center = tracks.find((tr) => tr.targetId === targetId);
  if (!center) return;
  const az0 = relAz(sim.own, trackAt(center, sim.t));
  for (const tr of tracks) {
    if (Math.abs(relAz(sim.own, trackAt(tr, sim.t)) - az0) > IFF_HALF_WIDTH_DEG) continue;
    const t = sim.targets.find((x) => x.id === tr.targetId);
    if (t) iff(sim, t);
  }
}

/** NCTR in STT: nose-on and close enough for ~2 s → the type print appears; ambiguous + hostile print → hostile. */
export function stepNctr(sim: Sim, dt: number) {
  const stt = sim.radar.stt;
  if (!stt || !sim.radar.nctr || stt.print) return;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  if (!t) return;
  const ok = aspect(sim.own, t) <= NCTR_MAX_ASPECT_DEG && range(sim.own, t) <= NCTR_MAX_RANGE_NM;
  stt.nctrTime = ok ? stt.nctrTime + dt : 0;
  if (stt.nctrTime < NCTR_TIME_S) return;
  stt.print = t.type;
  sim.events.push({ kind: 'nctr', targetId: t.id, print: t.type, text: `NCTR print: ${t.type}` });
  if (t.ident === 'ambiguous' && t.side === 'hostile') setIdent(sim, t, 'hostile');
}
