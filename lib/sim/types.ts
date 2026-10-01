export type Power = 'OFF' | 'STBY' | 'OPR';
export type Prf = 'MED' | 'HI' | 'INTL';
export type SearchMode = 'RWS' | 'TWS';
export type Mode = SearchMode | 'STT' | 'ACM';
export type Centering = 'AUTO' | 'MAN';
export type AcmMode = 'BST' | 'VACQ' | 'WACQ';
/** An ACM scan volume, degrees off the nose, with its auto-acquisition range gate (nm). */
export type AcmPattern = { az: [number, number]; el: [number, number]; gate: number };
export type Side = 'hostile' | 'friendly';
export type Ident = 'unknown' | 'friendly' | 'hostile';

export type Leg =
  | { kind: 'straight'; seconds: number }
  | { kind: 'turnTo'; hdg: number }
  | { kind: 'climbTo'; alt: number }
  | { kind: 'beam'; seconds: number };

export type Kinematics = { x: number; y: number; alt: number; hdg: number; spd: number };
export type Ownship = Kinematics;

export type Target = Kinematics & {
  id: string;
  type: string;
  rcs: number;
  side: Side;
  iffReplies: boolean;
  iffNeg: boolean; // interrogated with no reply: the HAFU stays unknown, but a hostile NCTR print now makes it hostile
  legs: Leg[];
  legTime: number;
  ident: Ident;
};

export type Antenna = { az: number; el: number; bar: number; dir: 1 | -1; frame: number };
export type Brick = { targetId: string; az: number; range: number; t: number };

/** A trackfile: what the radar believes about one target (a snapshot at its last detection). */
export type Track = Kinematics & { targetId: string; t: number; rank: number };

export type Stt = { targetId: string; memory: number; nctrTime: number; print: string | null };

export type Radar = {
  power: Power;
  sil: boolean;
  mode: Mode;
  searchMode: SearchMode; // what STT returns to
  acm: AcmMode | null; // ACM sub-mode while mode === 'ACM'
  prf: Prf;
  azWidth: number;
  bars: number;
  rangeScale: number;
  age: number;
  scanCenter: number;
  elev: number;
  centering: Centering; // TWS scan centring
  nctr: boolean;
  antenna: Antenna;
  tdc: boolean; // the TDC is assigned to this display (the diamond); castle right takes it
  aacq: boolean; // Automatic Acquisition armed: lock the closest contact as soon as the scan finds one
  ltws: boolean; // Latent TWS (DATA PB15): in RWS the cursor on a brick shows its trackfile
  cursor: { u: number; v: number };
  bumpLatched: boolean;
  bricks: Brick[];
  tracks: Track[];
  looks: Record<string, string>;
  ls: string | null; // launch-and-steering target (★)
  dt2: string | null; // secondary designated target (◇)
  stt: Stt | null;
  dataPage: boolean;
};

/** Held controls: -1 / 0 / 1 per axis, set every frame from pressed keys and on-screen buttons. */
export type Held = { tdcX: number; tdcY: number; elev: number; turn: number; fine: boolean; climb: number; accel: number };

/** Things that happened, in order. Append-only: each consumer (announcer, lessons, free play) keeps its own read index. */
export type SimEvent =
  | { kind: 'lock'; targetId: string; text: string }
  | { kind: 'lockLost'; text: string }
  | { kind: 'rts'; text: string }
  | { kind: 'ident'; targetId: string; ident: Ident; text: string }
  | { kind: 'nctr'; targetId: string; print: string; text: string }
  | { kind: 'acm'; acm: AcmMode; text: string }
  | { kind: 'tasking'; text: string }
  | { kind: 'debrief'; text: string; won: boolean };

export type Sim = {
  t: number;
  own: Ownship;
  targets: Target[];
  radar: Radar;
  held: Held;
  rand: () => number;
  events: SimEvent[];
};
