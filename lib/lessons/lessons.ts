import type { Ownship, Sim, SimEvent, Target } from '../sim/types.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { setPower } from '../sim/radar.ts';
import { altitudeCoverage, fromBscope, range, relAz, toBscope } from '../sim/geometry.ts';
import { trackAt } from '../sim/tracks.ts';
import type { Lesson } from './lesson.ts';

type Point = { u: number; v: number };
const onScope = (p: Point) => (p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1 ? p : null);

function lessonSim(seed: number, targets: Target[], own: Partial<Ownship> = {}, opr = true) {
  const s = createSim({ seed, own: { alt: 20000, hdg: 0, spd: 300, ...own }, targets });
  if (opr) setPower(s, 'OPR');
  return s;
}
const hasBrick = (s: Sim, id: string) => s.radar.bricks.some((b) => b.targetId === id);
const happened = (s: Sim, kind: SimEvent['kind']) => s.events.some((e) => e.kind === kind);
const cursorRange = (s: Sim) => fromBscope(s.radar.cursor.u, s.radar.cursor.v, s.radar.rangeScale).range;
const target = (s: Sim, id: string) => s.targets.find((t) => t.id === id);

/** Ring the newest brick of a target. */
const brickOf = (id: string) => (s: Sim) => {
  const b = s.radar.bricks.findLast((x) => x.targetId === id);
  return b ? onScope(toBscope(b.az, b.range, s.radar.rangeScale)) : null;
};
/** Ring a target's trackfile symbol. */
const trackOf = (id: string) => (s: Sim) => {
  const tr = s.radar.tracks.find((x) => x.targetId === id);
  if (!tr) return null;
  const k = trackAt(tr, s.t);
  return onScope(toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale));
};

export const LESSONS: Lesson[] = [
  {
    id: 'tutorial',
    title: 'Tutorial: your first lock',
    summary: 'Power up, read the B-scope, shape the scan, find a bandit and lock it.',
    setup: () => {
      const s = lessonSim(11, [makeTarget({ id: 'T1', x: -3, y: 40, alt: 35000, hdg: 175, spd: 250 })], { spd: 250 }, false);
      s.radar.tdc = false; // the TDC step hands it over
      return s;
    },
    steps: [
      {
        text: "This is the DDI, the Hornet's radar display. The 20 blank buttons around it are pushbuttons (PB1–PB20); what each one does is written on the screen right next to it.",
        highlight: ['ddi'],
      },
      {
        text: "The radar is in STBY: warm, but not transmitting. That's what the cross in the lower-left corner means. Turn the RADAR knob to OPR.",
        highlight: ['radar-knob'],
        until: (s) => s.radar.power === 'OPR',
      },
      {
        text: 'This is a B-scope, not a map. Range runs UP the screen (0 at the bottom, 40 nm at the top); azimuth runs ACROSS (70° left to 70° right of your nose). The instructor map shows the real geometry.',
        highlight: ['ddi', 'map'],
      },
      {
        text: "The cursor (TDC) only works on the display that owns it, marked by a small diamond in the top-right corner. There is none yet, so the cursor won't move. Push the castle switch right (L), toward the radar display, to take the TDC.",
        highlight: ['castle'],
        until: (s) => s.radar.tdc,
      },
      {
        text: 'The vertical line sweeping side to side is the antenna, scanning at about 80° per second. 140° wide × 4 bars means a fresh picture only every ~7 s. Narrow the scan: press PB19 (bottom row, second from left) until it reads 60°.',
        highlight: ['pb-19'],
        until: (s) => s.radar.azWidth === 60,
      },
      {
        text: 'Each "bar" is one horizontal sweep, stacked 1.2° apart. Press PB6 (top-left) until it reads 2B: 60° × 2 bars refreshes in about 1.5 s, but covers a thinner slice of sky.',
        highlight: ['pb-6'],
        until: (s) => s.radar.bars === 2,
      },
      {
        text: 'Change the range scale to 80 nm: press PB11 (↑, top of the right column), or push the cursor into the top edge of the scope.',
        highlight: ['pb-11', 'tdc'],
        until: (s) => s.radar.rangeScale === 80,
      },
      {
        text: "The numbers beside the cursor are the highest and lowest altitudes (thousands of feet) your scan covers at the cursor's range. AWACS reports a bandit about 40 nm ahead at angels 35, above your scan. Roll the antenna up (ANT EL ▲, key R) until a brick (a small bar) appears.",
        highlight: ['elevation'],
        until: (s) => hasBrick(s, 'T1'),
      },
      {
        text: 'That brick is a raw radar hit. Slew the cursor onto it with the TDC (drag it, or W A S D): its trackfile pops up with Mach and altitude. TDC DEPRESS (Space) makes it your target (★); press it again to lock: Single Target Track (STT).',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: "Locked. The antenna now follows only this target. Left of the symbol is its Mach, right its altitude; top-left its heading; the caret on the right edge marks its range, with closure speed beside it. A locked target's warning receiver now knows it is being tracked.",
        highlight: ['ddi'],
      },
      {
        text: 'Press UNDESIGNATE (U) to break the lock and return to search.',
        highlight: ['undesignate'],
        until: (s) => s.radar.mode === 'RWS',
      },
      {
        text: "That's the core loop: search, find, lock. The lessons below the cockpit go deeper, one skill at a time.",
      },
    ],
  },
  {
    id: 'scan',
    title: 'Scan volume and frame time',
    summary: 'Trade coverage for refresh rate: azimuth width, bars and scan centre.',
    setup: () =>
      lessonSim(21, [
        makeTarget({ id: 'A', x: -18, y: 30, hdg: 150, spd: 250 }),
        makeTarget({ id: 'B', x: 12, y: 32, hdg: 200, spd: 250 }),
      ], { spd: 250 }),
    steps: [
      {
        text: 'Your scan volume is azimuth width × number of bars. A wide, tall scan sees more sky, but the antenna needs longer to cover it: 140° × 4 bars at ~80°/s is a 7-second frame. Watch the bar counter on PB6 step 1-2-3-4.',
        highlight: ['pb-6', 'pb-19'],
      },
      {
        text: 'Press PB19 until the scan is 20° wide.',
        highlight: ['pb-19'],
        until: (s) => s.radar.azWidth === 20,
      },
      {
        text: 'A 20° scan centred on your nose sees neither contact. Put the cursor on an empty spot about halfway between the centre and the left edge of the scope (≈30° left) and press Space: the scan centre moves there.',
        highlight: ['tdc'],
        until: (s) => s.radar.scanCenter <= -20,
      },
      {
        text: 'Now press PB6 until it reads 2B. A 20° × 2-bar scan refreshes twice a second. Wait for the left contact to paint.',
        highlight: ['pb-6'],
        until: (s) => s.radar.bars === 2 && hasBrick(s, 'A'),
      },
      {
        text: 'Small scans are fast but narrow: great once you know where to look (after an AWACS call, say), poor for finding things. Wide scans find; narrow scans follow.',
      },
    ],
  },
  {
    id: 'elevation',
    title: 'Elevation and altitude coverage',
    summary: 'Read the altitude numbers by the cursor and put the scan where the bandit is.',
    setup: () => lessonSim(22, [makeTarget({ id: 'T1', x: 1, y: 30, alt: 5000, spd: 300 })], { alt: 25000 }),
    steps: [
      {
        text: "Your scan is a thin wedge that gets taller with range. The numbers above and below the cursor are the highest and lowest altitudes it covers AT THE CURSOR'S RANGE, in thousands of feet.",
        highlight: ['ddi'],
        mark: (s) => onScope(s.radar.cursor),
      },
      {
        text: 'Slew the cursor up to about 30 nm (three quarters of the way up the scope) and watch the numbers change.',
        highlight: ['tdc'],
        until: (s) => cursorRange(s) >= 26 && cursorRange(s) <= 34,
      },
      {
        text: 'AWACS: single contact, 30 nm, angels 5. Your lower number is far above 5, so the bandit is flying under your scan. Roll the antenna down with F until it paints.',
        highlight: ['elevation', 'map'],
        until: (s) => hasBrick(s, 'T1'),
      },
      {
        text: 'Always check the altitude numbers at the range where you expect the target. Close targets need big elevation changes; far ones only a little.',
      },
    ],
  },
  {
    id: 'lock',
    title: 'Lock-on (STT) and target data',
    summary: 'Lock a contact, read what STT tells you, and find where the lock breaks.',
    setup: () => lessonSim(23, [makeTarget({ id: 'T1', x: 6, y: 28, alt: 22000, hdg: 190, spd: 350 })]),
    steps: [
      {
        text: 'Find the contact and lock it: cursor on its brick, then Space twice (first ★, then lock) or castle right (L) once.',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: "In STT the display is all about one target. Mach (left) and altitude (right) sit beside the star; top-left is its heading; the right-edge caret shows its range with closure speed in knots beside it. The range scale now adjusts itself.",
        highlight: ['ddi'],
      },
      {
        text: 'The antenna can only look 70° either side of the nose. Turn hard left (hold ←) and keep turning until the lock breaks.',
        highlight: ['flight'],
        until: (s) => happened(s, 'lockLost'),
      },
      {
        text: 'Locks also break when the target dives into the Doppler notch (the last lesson) or flies out of range. When a lock breaks, the radar goes back to search.',
      },
    ],
  },
  {
    id: 'tws',
    title: 'TWS: trackfiles, L&S and DT2',
    summary: 'Track several contacts at once and build the designation ladder.',
    setup: () =>
      lessonSim(24, [
        makeTarget({ id: 'L', x: -6.2, y: 29.4, spd: 300 }),
        makeTarget({ id: 'C', x: 0, y: 30, spd: 300 }),
        makeTarget({ id: 'R', x: 6.2, y: 29.4, spd: 300 }),
      ]),
    steps: [
      {
        text: 'Press PB5 (top of the left column) to switch from RWS to TWS: Track While Scan.',
        highlight: ['pb-5'],
        until: (s) => s.radar.mode === 'TWS',
      },
      {
        text: "TWS narrowed the scan to 40° × 4 bars so every contact is revisited every 2 s. Each contact is now a trackfile: a symbol with a stem showing where it's heading. The number inside is its rank (1 = closest).",
        highlight: ['pb-19', 'pb-6'],
      },
      {
        text: 'Designate a trackfile: cursor on it, Space. It becomes the Launch & Steering target (★).',
        highlight: ['tdc'],
        until: (s) => s.radar.ls !== null,
      },
      {
        text: 'Designate a second trackfile the same way: it becomes the secondary target, DT2 (◇).',
        highlight: ['tdc'],
        until: (s) => s.radar.dt2 !== null,
      },
      {
        text: 'Press U: with both designated, undesignate swaps ★ and ◇. Then press PB14 (RSET) to clear both.',
        highlight: ['undesignate', 'pb-14'],
        until: (s) => s.radar.ls === null && s.radar.dt2 === null,
      },
      {
        text: 'Press U once more: with nothing designated, undesignate makes the #1-ranked trackfile the L&S.',
        highlight: ['undesignate'],
        until: (s) => s.radar.ls !== null,
      },
      {
        text: 'Press PB13 to switch scan centring from MAN to AUTO: the scan now follows the L&S by itself.',
        highlight: ['pb-13'],
        until: (s) => s.radar.centering === 'AUTO',
      },
      {
        text: 'Space on the ★ would lock it (STT). TWS keeps a picture of everyone; STT gives the best data on one target, and tells that target it is locked.',
      },
    ],
  },
  {
    id: 'ident',
    title: 'IFF, NCTR and HAFU symbols',
    summary: 'Tell friend from foe before you commit.',
    setup: () =>
      lessonSim(25, [
        makeTarget({ id: 'F', type: 'F-16', side: 'friendly', iffReplies: true, x: -5, y: 22, alt: 18000, hdg: 170, spd: 300 }),
        makeTarget({ id: 'H', x: 5, y: 20, alt: 22000, hdg: 190, spd: 300 }),
      ]),
    steps: [
      {
        text: 'Trackfile symbols (HAFU) show identity by shape: open box = unknown; box with a bold top = ambiguous (no IFF reply); arc = friendly; chevron = hostile.',
        highlight: ['ddi'],
      },
      {
        text: 'Switch to TWS (PB5) so both contacts show as trackfiles.',
        highlight: ['pb-5'],
        until: (s) => s.radar.mode === 'TWS',
      },
      {
        text: "Put the cursor on a trackfile and press the castle switch in (O): the radar asks the aircraft's transponder for an IFF reply. Do it for both contacts; they are too far apart for one interrogation.",
        highlight: ['castle'],
        until: (s) => s.targets.every((t) => t.ident !== 'unknown'),
      },
      {
        text: "The friendly replied: arc. The other stayed silent: ambiguous. Silence alone isn't proof. Lock it (Space twice: first ★, then STT) and keep it nose-on: inside 25 nm, NCTR recognises the engines and prints the aircraft type after about 2 s.",
        highlight: ['tdc'],
        mark: trackOf('H'),
        until: (s) => target(s, 'H')?.ident === 'hostile',
      },
      {
        text: "Friendly = IFF reply. Hostile = no reply AND a hostile NCTR print. Anything else stays unknown or ambiguous, and the ID is advice: the decision is the pilot's.",
      },
    ],
  },
  {
    id: 'acm',
    title: 'ACM: close-in auto-acquisition',
    summary: 'Boresight, Wide and Vertical acquisition for the visual fight.',
    setup: () =>
      lessonSim(26, [
        makeTarget({ id: 'T1', x: 1.5, y: 9.5, alt: 20000, hdg: 185, spd: 250 }),
        makeTarget({ id: 'T2', x: -4, y: 12, alt: 20500, hdg: 175, spd: 250 }),
      ], { spd: 250 }),
    steps: [
      {
        text: 'Inside 10 nm there is no time to hunt for bricks. ACM modes scan a small volume in front of you and lock the first thing they find. The HUD window shows the pattern.',
        highlight: ['castle'],
      },
      {
        text: 'Push the castle switch forward (I): ACM Boresight (BST), a 3.3° beam straight down your nose.',
        highlight: ['castle'],
        until: (s) => s.radar.mode === 'ACM',
      },
      {
        text: 'Point your nose at the bandit: turn right (→, hold Shift for fine control) until its diamond sits in the small circle on the HUD. BST locks it automatically.',
        highlight: ['flight', 'hud'],
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'Break the lock (U), go back to ACM (I), then push the castle left (J): Wide Acquisition (WACQ), a 60°-wide box.',
        highlight: ['undesignate', 'castle'],
        until: (s) => s.radar.mode === 'ACM' && s.radar.acm === 'WACQ',
      },
      {
        text: 'WACQ locks the first contact inside the box within 10 nm, with no aiming needed.',
        highlight: ['hud'],
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'The third mode, Vertical Acquisition (castle aft, K), scans a tall, narrow column above your nose: for a bandit you are pulling up into during a turning fight.',
      },
    ],
  },
  {
    id: 'notch',
    title: 'PRF and the Doppler notch',
    summary: 'Why a bandit flying across your nose can vanish from a pulse-Doppler radar.',
    setup: () =>
      lessonSim(27, [
        makeTarget({
          id: 'T1', x: 0, y: 35, spd: 400,
          legs: [
            { kind: 'straight', seconds: 40 }, { kind: 'beam', seconds: 60 }, { kind: 'turnTo', hdg: 180 },
            { kind: 'straight', seconds: 30 }, { kind: 'beam', seconds: 60 }, { kind: 'turnTo', hdg: 180 },
            { kind: 'straight', seconds: 30 }, { kind: 'beam', seconds: 200 },
          ],
        }),
      ]),
    steps: [
      {
        text: 'PRF is how often the radar pulses. HI PRF sees nose-on targets far away but struggles with anything moving away from you; MED PRF sees every aspect at shorter range; INTL alternates the two bar by bar.',
        highlight: ['pb-1'],
      },
      {
        text: 'Select HI PRF: press PB1 (bottom of the left column) until it reads HI.',
        highlight: ['pb-1'],
        until: (s) => s.radar.prf === 'HI',
      },
      {
        text: 'Lock the contact: cursor on its brick, then Space twice or L.',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'Keep the lock and watch: the bandit turns 90° to put you on its wing ("beaming"). Its speed toward you drops to almost nothing, the same Doppler as the ground, and the radar filters it out with the clutter. MEM appears for 3 s, then the lock breaks.',
        highlight: ['ddi', 'map'],
        until: (s) => happened(s, 'lockLost'),
      },
      {
        text: 'That is the notch. Beaming defeats pulse-Doppler radars; the counter is geometry. Change your heading so the bandit is no longer at 90° to your line of sight, and it comes back.',
      },
    ],
  },
  {
    id: 'awacs',
    title: 'From an AWACS call to a lock',
    summary: 'Turn a BRAA call into range scale, cursor and antenna elevation, then lock.',
    setup: () => {
      // 45 nm at bearing 035, angels 8, pointed at us
      const s = lessonSim(28, [makeTarget({ id: 'T1', x: 25.8, y: 36.9, alt: 8000, hdg: 215, spd: 400 })], { alt: 25000 });
      s.radar.rangeScale = 20;
      return s;
    },
    steps: [
      {
        text: 'AWACS: "Single group, BRAA 035 / 45 / ANGELS 8 / HOT". Bearing 035 from you (you fly 000, so 35° right of the nose), 45 nm, 8,000 ft, pointed at you. In DCS the same contact often shows on the SA page through datalink first: your radar still has to be pointed at it.',
        highlight: ['map'],
      },
      {
        text: 'Your range scale is 20 nm, too short for a 45 nm call. Raise it to 80: PB11, or push the cursor into the top edge.',
        highlight: ['pb-11', 'tdc'],
        until: (s) => s.radar.rangeScale >= 80,
      },
      {
        text: 'Put the cursor where the call is: 35° right (about three quarters of the way across) and 45 nm (just over half way up).',
        highlight: ['tdc'],
        until: (s) => {
          const p = fromBscope(s.radar.cursor.u, s.radar.cursor.v, s.radar.rangeScale);
          return Math.abs(p.az - 35) <= 7 && Math.abs(p.range - 45) <= 6;
        },
      },
      {
        text: 'The numbers beside the cursor are the altitudes your scan covers at 45 nm. You are at 25,000 ft and the call says angels 8, so you are looking over it. Roll the antenna down (F) until 8 sits between the two numbers.',
        highlight: ['elevation'],
        until: (s) => {
          const c = altitudeCoverage(s.own.alt, cursorRange(s), s.radar.elev, s.radar.bars);
          return c.lo <= 8 && c.hi >= 8;
        },
      },
      {
        text: 'Now wait for the brick near the cursor and lock it: Space twice, or castle right (L).',
        highlight: ['tdc', 'castle'],
        mark: brickOf('T1'),
        until: (s) => s.radar.stt?.targetId === 'T1',
      },
      {
        text: 'That is the pick-up routine for any AWACS or datalink call: range scale, cursor on the call, elevation from the altitude, then lock. The usual reason a called contact never shows up is an antenna pointed at the wrong altitude.',
      },
    ],
  },
];
