# Hornet Radar Trainer — Plan 6: DCS Behaviour Fixes from Chuck's Guide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the trainer's DCS behaviour match Chuck's F/A-18C guide (Dec 2025 edition) wherever the two disagree and the guide is unambiguous.

**Architecture:** All behaviour changes live in `lib/sim/` (radar state machine, pushbuttons, identification). Display changes are in the `lib/ddi/` canvas painters. User-facing copy (lessons, reference sections, user guide) and the research record (`docs/research/apg-73.md`) are updated in the same task as the behaviour they describe.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind v4, Node 25 `node --test` with native type stripping.

**Reference:** Chuck's Guides, *DCS F/A-18C Hornet*, https://chucksguides.com/aircraft/dcs/fa-18c/ (PDF last modified 7 Dec 2025). Page numbers below are PDF pages. Part 9 §2.1 (pp. 183–229) covers the A/A radar; Part 12 (pp. 627–645) covers IFF, NCTR and HAFU.

**Sequence:** Plan 6. Requires Plans 1–5 (all built). Work on a branch, e.g. `git switch -c fix/dcs-guide-discrepancies`.

## Global Constraints

- `lib/` stays framework-free; files in `lib/` import each other with explicit `.ts` extensions.
- All randomness goes through `sim.rand`.
- When a lesson's setup or steps change, its walkthrough in `lib/lessons/lessons.test.ts` must still pass.
- New spotlightable UI needs a `data-tut` attribute (none is added in this plan).
- No new dependencies.
- Baseline before Task 1: `npm test` → 116 pass, 0 fail; `npx tsc --noEmit -p .` → exit 0.

---

## Findings

### Discrepancies fixed by this plan

| # | Area | Trainer today | Chuck's guide | Evidence | Task |
|---|---|---|---|---|---|
| 1 | TWS scan limits | 2B ≤ 80°, 4B ≤ 60°, 6B ≤ 40°; the azimuth PB only offers widths that fit the current bars | 2B ≤ 80°, **4B ≤ 40°, 6B ≤ 20°**. Raising one setting lowers the other: a wider azimuth drops the bars | p209 table plus a worked example ("60° with 4B or 6B → 2B; 4B at 60° → 40°"). Our research used Hoggit's 80/60/40 | 1 |
| 2 | TWS AUTO centring | Stays AUTO, shown as AUTO, after the L&S is lost | "If the L&S is lost/undesignated, MAN is automatically entered" | p212 | 1 |
| 3 | IFF with no reply | HAFU becomes **ambiguous** | HAFU stays **unknown**. Ambiguous means own ID and a datalink donor's ID conflict. Hostile = negative IFF **and** a hostile NCTR print (or donor ID) | p636 rules; p639 caption "contact interrogated but still unknown" | 2 |
| 4 | ACM DDI page | PB5 shows the sub-mode (not pressable); PB7 is SIL | PB5 is **RTS + search mode**; a **boxed ACM** legend sits at PB7 (no SIL); the sub-mode is shown on the HUD | p217 text and screenshot | 3 |
| 5 | ACM and TDC | Entering ACM leaves TDC priority alone | "The TDC is automatically assigned to the RDR ATTK page" | p217 | 3 |
| 6 | AACQ with nothing to lock | Castle right does nothing | AACQ arms: "AACQ" on the DDI (DCS also shows it on the HUD; the trainer's HUD window only appears in ACM/STT, so it was dropped, commit 8c0ef7a), the radar locks the closest contact it detects; castle aft exits | pp. 202, 227, AACQ screenshot | 4 |
| 7 | Castle left / aft outside ACM | Do nothing | Hand the TDC to the left DDI / AMPCD: the radar loses the diamond | p203 ("AFT: TDC to AMPCD, LEFT: TDC to left DDI") | 4 |
| 8 | Trackfile altitude label | Whole thousands ("7") | Thousands to one decimal ("6.5", "10.1") | Screenshots pp. 205, 207, 225 | 5 |
| 9 | Ownship speed block | Mach above speed | Speed above Mach ("375" over "M 0.63") | Screenshots pp. 187, 225 | 5 |
| 10 | TWS data labels | Mach and altitude only on the L&S and DT2 | Also on the trackfile under the cursor | p208 | 5 |
| 11 | HUD target designator in STT | Always a square | Diamond for a hostile, square otherwise | pp. 225, 640 | 5 |

### Matches the guide (no change)

Range scales 5–160 nm; azimuth 20/40/60/80/140°; bars 1/2/4/6; 10 trackfiles; RWS/TWS/STT pushbutton positions (checked against the screenshots on pp. 187, 207, 225, including PB6 bars, PB7 SIL, PB8 ERASE, PB10 TWS in STT, PB11/12 range, PB13 AUTO/MAN, PB14 RSET, PB15 NCTR, PB16 DATA, PB19 azimuth, and the AGE value at PB10 on the DATA page); the PRF legend ("HI / INTL"); cursor altitude coverage; the LTWS designate-then-lock ladder; undesignate swapping L&S and DT2 and stepping the ranks; STT dropping the other trackfiles; RTS returning to the last search mode; STT→TWS on PB10; the ACM scan volumes and range gates (BST ±1.7° × 3.3° / 10 nm, VACQ 6° × −13…+46° / 5 nm, WACQ 60° × −9…+6° / 10 nm); castle forward/aft/left inside ACM; undesignate leaving ACM; castle depress for IFF; the 22° IFF scan; NCTR's 25 nm limit; the BST dashed circle on the HUD.

### Verify in DCS before changing (not in this plan)

These come from Chuck's guide alone, or conflict with Hoggit, and would change lessons. A two-minute check in DCS settles each one.

- **An L&S always exists in TWS** (p208). Check: TWS with three contacts, press RSET; does a ★ come back by itself? If yes: in `stepRadar`, TWS with trackfiles and no L&S makes rank 1 the L&S, and the TWS lesson's RSET/undesignate steps need rewriting.
- **IFF on target-under-cursor in LTWS** (p204: "An IFF interrogation is automatically sent when a TUC is performed"). Check: LTWS on, cursor onto a friendly's brick, no castle press; does the HAFU turn friendly? If yes: edge-trigger `interrogate` when the brick under the cursor changes.
- **BIAS scan centring** (p212 describes it; Hoggit said it was not implemented). Check: TWS AUTO with an L&S, TDC press on empty space; does PB13 read BIAS?
- **STT bars legend** (p225 screenshot shows no PB6 legend in STT; Hoggit's table shows one). Cosmetic.
- **RSET** (p187: "Radar settings are returned to default settings"). The trainer follows Hoggit (clear L&S/DT2, exit EXP/RAID). Leave unless DCS shows otherwise.
- **PB13 AUTO with no L&S.** The trainer drops back to MAN on the next frame (p212 only covers a lost L&S). Check: TWS with no ★, press PB13; does AUTO stay selected?
- **ACM stays engaged through an ACM lock** (p217). Castle aft/left during an ACM-acquired STT would switch the ACM sub-mode. Low value.

### Out of scope (in the guide, not in the trainer)

VS, Spotlight, SCAN RAID, STT RAID, EXP, HITS, the AZ/EL page, GACQ, HACQ/LHACQ, uncaged WACQ, SET/CHAN, master modes, launch zones. Task 6 lists the radar ones in the "What does the trainer leave out?" answer.

---

### Task 1: TWS scan limits and AUTO→MAN fallback

**Files:**
- Modify: `lib/sim/constants.ts`
- Modify: `lib/sim/radar.ts` (`azOptions`, `clipScan`, `bump`, `stepRadar`)
- Modify: `lib/sim/pushbuttons.ts` (PB19)
- Test: `lib/sim/tws.test.ts`, `lib/sim/pushbuttons.test.ts`
- Copy: `lib/lessons/lessons.ts`, `components/sections/HowItWorks.tsx`, `components/sections/ControlsReference.tsx`, `docs/USER_GUIDE.md`, `docs/research/apg-73.md`

**Interfaces:**
- Produces: `clipScan(r: Radar, keep?: 'bars' | 'az')` (default `'bars'`); `azOptions(r)` returns `[20, 40, 60, 80]` in TWS regardless of bars.

- [ ] **Step 1: Write the failing tests**

In `lib/sim/tws.test.ts`, replace the test `'entering TWS clips the scan to the ~3 s frame limits'` with:

```ts
test('entering TWS keeps the bars and narrows the azimuth (2B ≤ 80°, 4B ≤ 40°, 6B ≤ 20°)', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.azWidth, 40);
  assert.equal(s.radar.bars, 4);
  s.radar.bars = 1;
  s.radar.azWidth = 140;
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.bars, 2);
  assert.equal(s.radar.azWidth, 80);
});
```

Replace the test `'TWS cursor bumps respect the TWS azimuth limits'` with:

```ts
test('a TWS cursor bump to a wider azimuth drops the bars to fit', () => {
  const s = trio();
  setSearchMode(s, 'TWS'); // 40°/4B
  s.radar.cursor = { u: 0.99, v: 0.5 };
  s.held.tdcX = 1;
  run(s, 0.2);
  assert.deepEqual([s.radar.azWidth, s.radar.bars], [60, 2]);
});

test('AUTO centring falls back to MAN when the L&S goes away', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  s.radar.ls = 'R';
  s.radar.centering = 'AUTO';
  run(s, 0.1);
  assert.equal(s.radar.centering, 'AUTO');
  rset(s);
  run(s, 0.1);
  assert.equal(s.radar.centering, 'MAN');
});
```

In `lib/sim/pushbuttons.test.ts`, replace the test `'TWS bar and azimuth buttons stay inside the frame limits'` with:

```ts
test('TWS limits (2B ≤ 80°, 4B ≤ 40°, 6B ≤ 20°): the setting you change wins, the other gives way', () => {
  const s = createSim();
  const scan = () => [s.radar.azWidth, s.radar.bars];
  pushbuttons(s)[5].press!(); // TWS from 140°/4B: keeps 4B, narrows to 40°
  assert.deepEqual(scan(), [40, 4]);
  pushbuttons(s)[19].press!(); // a wider azimuth drops the bars
  assert.deepEqual(scan(), [60, 2]);
  pushbuttons(s)[19].press!();
  pushbuttons(s)[19].press!(); // never 140° in TWS: 80° wraps to 20°
  assert.deepEqual(scan(), [20, 2]);
  pushbuttons(s)[6].press!(); // more bars narrow the azimuth only if needed
  assert.deepEqual(scan(), [20, 4]);
  pushbuttons(s)[19].press!(); // 40° still fits 4B
  assert.deepEqual(scan(), [40, 4]);
  pushbuttons(s)[6].press!();
  assert.deepEqual(scan(), [20, 6]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/sim/tws.test.ts lib/sim/pushbuttons.test.ts`
Expected: FAIL. The entry test gets 60 (not 40), the bump test gets `[20, 4]`, the PB test gets `[60, 4]` on its first assertion, the AUTO test stays `'AUTO'`.

- [ ] **Step 3: Implement**

`lib/sim/constants.ts`: replace

```ts
export const SCAN_RATE_DPS = 80; // ESTIMATE: fits the TWS <= 3 s frame limits
```

with

```ts
export const SCAN_RATE_DPS = 80; // ESTIMATE: a full TWS frame (≤ 160°-bars) then takes ≤ 2 s
```

and replace

```ts
// TWS keeps the frame near 3 s: no 1-bar scan, and azimuth capped per bar count
export const TWS_BARS: readonly number[] = [2, 4, 6];
export const TWS_MAX_AZ: Readonly<Record<number, number>> = { 2: 80, 4: 60, 6: 40 };
```

with

```ts
// TWS caps the scan at 160°-bars (Chuck's DCS guide, Dec 2025, p209): no 1-bar scan, azimuth capped per bar count
export const TWS_BARS: readonly number[] = [2, 4, 6];
export const TWS_MAX_AZ: Readonly<Record<number, number>> = { 2: 80, 4: 40, 6: 20 };
```

`lib/sim/radar.ts`: replace

```ts
/** Azimuth widths available now: TWS caps the frame near 3 s (2B ≤ 80°, 4B ≤ 60°, 6B ≤ 40°). */
export const azOptions = (r: Radar) =>
  r.mode === 'TWS' ? AZ_WIDTHS.filter((a) => a <= TWS_MAX_AZ[r.bars]) : AZ_WIDTHS;

/** Clip bars and azimuth to what the current mode allows (the real radar clips on TWS entry). */
export function clipScan(r: Radar) {
  if (!barOptions(r).includes(r.bars)) r.bars = barOptions(r)[0];
  const az = azOptions(r);
  if (!az.includes(r.azWidth)) r.azWidth = az.filter((a) => a <= r.azWidth).at(-1) ?? az[0];
}
```

with

```ts
/** Azimuth widths available now: TWS never scans wider than 80°. */
export const azOptions = (r: Radar) => (r.mode === 'TWS' ? AZ_WIDTHS.filter((a) => a <= TWS_MAX_AZ[2]) : AZ_WIDTHS);

/** Keep a TWS scan inside its limits (2B ≤ 80°, 4B ≤ 40°, 6B ≤ 20°). The setting just changed wins and the other gives way;
 *  entering TWS keeps the bars (1B becomes 2B) and narrows the azimuth. */
export function clipScan(r: Radar, keep: 'bars' | 'az' = 'bars') {
  if (r.mode !== 'TWS') return;
  if (!TWS_BARS.includes(r.bars)) r.bars = TWS_BARS[0];
  if (keep === 'az') r.bars = Math.min(r.bars, TWS_BARS.findLast((b) => TWS_MAX_AZ[b] >= r.azWidth)!);
  r.azWidth = Math.min(r.azWidth, TWS_MAX_AZ[r.bars]);
}
```

In `bump`, after the two azimuth lines

```ts
  if (edge === 'left') r.azWidth = cycle(azOptions(r), r.azWidth, -1);
  if (edge === 'right') r.azWidth = cycle(azOptions(r), r.azWidth, 1);
```

add

```ts
  if (edge === 'left' || edge === 'right') clipScan(r, 'az');
```

In `stepRadar`, after

```ts
  const auto = r.mode === 'TWS' && r.centering === 'AUTO' && autoCenter(sim);
```

add

```ts
  if (r.mode === 'TWS' && r.centering === 'AUTO' && !auto) r.centering = 'MAN'; // the L&S is gone: DCS falls back to MAN
```

`lib/sim/pushbuttons.ts`: replace

```ts
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(azOptions(r), r.azWidth); } };
```

with

```ts
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(azOptions(r), r.azWidth); clipScan(r, 'az'); } };
```

- [ ] **Step 4: Update the copy**

`lib/lessons/lessons.ts` (TWS lesson, second step): replace
`TWS narrowed the scan to 60° × 4 bars so every contact is revisited at least every ~3 s.`
with
`TWS narrowed the scan to 40° × 4 bars so every contact is revisited every 2 s.`

`components/sections/HowItWorks.tsx`: replace
`limits the scan so every contact is revisited within about 3 s and`
with
`limits the scan so every contact is revisited within about 2 s and`

`components/sections/ControlsReference.tsx`: replace

```ts
  ['PB6', 'Bars 1/2/4/6', 'Bars 2/4/6', 'Bar number only', '—', '—'],
```

with

```ts
  ['PB6', 'Bars 1/2/4/6', 'Bars 2/4/6 (narrows the azimuth to fit)', 'Bar number only', '—', '—'],
```

and

```ts
  ['PB19', 'Azimuth 20–140°', 'Azimuth (TWS limits)', '—', '—', '—'],
```

with

```ts
  ['PB19', 'Azimuth 20–140°', 'Azimuth 20–80° (drops bars to fit)', '—', '—', '—'],
```

`docs/USER_GUIDE.md`: replace
`**PB13** toggles AUTO / MAN scan centring.`
with
`**PB13** toggles AUTO / MAN scan centring (AUTO falls back to MAN if the ★ is lost). The scan is capped at 2 bars × 80°, 4 × 40° or 6 × 20°.`

`docs/research/apg-73.md`, TWS section: replace

```markdown
**Scan volume.** Restricted so a frame takes about 3 s or less [D HOG]:

| Bars | Max azimuth |
|---|---|
| 2 | 80° |
| 4 | 60° |
| 6 | 40° |

Minimum width is 20°, and neither 1 bar nor 140° is allowed. Settings outside these limits are clipped on entry.
```

with

```markdown
**Scan volume.** Restricted to 160°-bars or less [D CHK p209, with a worked example; Hoggit's 80/60/40° table is superseded]:

| Bars | Max azimuth |
|---|---|
| 2 | 80° |
| 4 | 40° |
| 6 | 20° |

Minimum width is 20°, and neither 1 bar nor 140° is allowed. Raising one setting lowers the other if needed. Entering TWS keeps the bars (1B becomes 2B) and narrows the azimuth [D CHK].
```

In the same section replace `- **AUTO:** the scan center and elevation follow the L&S and DT2.` with
`- **AUTO:** the scan center and elevation follow the L&S and DT2. If the L&S is lost, MAN is entered automatically [D CHK p212].`
and replace `- **BIAS:** listed, but not implemented in DCS.` with
`- **BIAS:** a TDC press on empty space in AUTO shifts the scan toward that azimuth, keeping the L&S and DT2 inside [D CHK p212]. Hoggit called it unimplemented. Not simulated.`

In §10 Sources, add this row after the `HOG / HOG-IMG` row:

```markdown
| CHK | https://chucksguides.com/aircraft/dcs/fa-18c/ (PDF https://assets.chucksguides.com/pdf/DCS%20FA-18C%20Hornet%20Guide.pdf, Dec 2025; Part 9 §2.1 pp. 183–229, Part 12 pp. 627–645) | Community guide with current DCS screenshots; high for DCS behaviour. Page numbers are PDF pages |
```

- [ ] **Step 5: Run all tests and the type check**

Run: `npm test` then `npx tsc --noEmit -p .`
Expected: 117 pass, 0 fail (the lesson walkthroughs still complete with a 40° TWS scan); tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/constants.ts lib/sim/radar.ts lib/sim/pushbuttons.ts lib/sim/tws.test.ts lib/sim/pushbuttons.test.ts lib/lessons/lessons.ts components/sections/HowItWorks.tsx components/sections/ControlsReference.tsx docs/USER_GUIDE.md docs/research/apg-73.md
git commit -m "fix: TWS scan limits 80/40/20 and AUTO falls back to MAN, per Chuck's guide" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: An unanswered IFF leaves the HAFU unknown

**Files:**
- Modify: `lib/sim/types.ts`, `lib/sim/world.ts`, `lib/sim/ident.ts`, `lib/ddi/draw.ts` (`hafu`)
- Test: `lib/sim/ident.test.ts`
- Copy: `lib/lessons/lessons.ts` (ident lesson), `components/sections/HowItWorks.tsx`, `docs/USER_GUIDE.md`, `docs/research/apg-73.md`

**Interfaces:**
- Produces: `Ident = 'unknown' | 'friendly' | 'hostile'` (no `'ambiguous'`); `Target.iffNeg: boolean` (interrogated, no reply); `makeTarget` defaults `iffNeg: false`. An unanswered interrogation pushes one `{ kind: 'ident', ident: 'unknown', text: 'Contact N nm: no IFF reply' }` event.

- [ ] **Step 1: Write the failing tests**

In `lib/sim/ident.test.ts`, replace the test `'IFF: a reply means friendly, silence means ambiguous, and a hostile never downgrades'` with:

```ts
test('IFF: a reply means friendly; silence leaves the HAFU unknown but is remembered, once', () => {
  const s = pair();
  const [f, h] = s.targets;
  iff(s, f);
  iff(s, h);
  assert.equal(f.ident, 'friendly');
  assert.equal(h.ident, 'unknown');
  assert.equal(h.iffNeg, true);
  iff(s, h);
  assert.equal(s.events.filter((e) => e.kind === 'ident').length, 2);
  assert.equal(s.events.at(-1)?.text.endsWith('no IFF reply'), true);
});
```

In `'castle press interrogates only trackfiles within ±11° of the one under the cursor'`, replace

```ts
  assert.equal(s.targets[1].ident, 'unknown');
```

with

```ts
  assert.equal(s.targets[1].iffNeg, false);
```

In `'locking interrogates automatically; NCTR prints the type nose-on inside 25 nm and confirms hostile'`, replace

```ts
  assert.equal(s.targets[1].ident, 'ambiguous');
```

with

```ts
  assert.equal(s.targets[1].ident, 'unknown');
  assert.equal(s.targets[1].iffNeg, true);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/sim/ident.test.ts`
Expected: FAIL (`h.ident` is `'ambiguous'`; `iffNeg` is `undefined`).

- [ ] **Step 3: Implement**

`lib/sim/types.ts`: replace

```ts
export type Ident = 'unknown' | 'ambiguous' | 'friendly' | 'hostile';
```

with

```ts
export type Ident = 'unknown' | 'friendly' | 'hostile';
```

and in `Target`, after `iffReplies: boolean;` add

```ts
  iffNeg: boolean; // interrogated with no reply: the HAFU stays unknown, but a hostile NCTR print now makes it hostile
```

`lib/sim/world.ts` (`makeTarget`): replace

```ts
    alt: 20000, hdg: 180, spd: 450, legs: [], legTime: 0, ident: 'unknown',
```

with

```ts
    alt: 20000, hdg: 180, spd: 450, legs: [], legTime: 0, ident: 'unknown', iffNeg: false,
```

`lib/sim/ident.ts`: replace everything from `const WORD` down to the end of `iff` with

```ts
const WORD: Record<Ident, string> = { unknown: 'UNKNOWN', friendly: 'FRIENDLY', hostile: 'HOSTILE' };

const announce = (sim: Sim, t: Target, text: string) =>
  sim.events.push({ kind: 'ident', targetId: t.id, ident: t.ident, text: `Contact ${Math.round(range(sim.own, t))} nm: ${text}` });

// ponytail: identity lives on the target, not the trackfile; revisit if datalink is added
function setIdent(sim: Sim, t: Target, ident: Ident) {
  if (t.ident === ident) return;
  t.ident = ident;
  announce(sim, t, WORD[ident]);
}

/** IFF: a reply means friendly. Silence leaves the HAFU unknown (as in DCS) but is remembered for NCTR. */
export function iff(sim: Sim, t: Target) {
  if (t.iffReplies) return setIdent(sim, t, 'friendly');
  if (t.iffNeg) return;
  t.iffNeg = true;
  announce(sim, t, 'no IFF reply');
}
```

In `stepNctr`, replace the doc comment and the last line:

```ts
/** NCTR in STT: nose-on and close enough for ~2 s → the type print appears; ambiguous + hostile print → hostile. */
```

becomes

```ts
/** NCTR in STT: nose-on and close enough for ~2 s → the type print appears; no IFF reply + hostile print → hostile. */
```

and

```ts
  if (t.ident === 'ambiguous' && t.side === 'hostile') setIdent(sim, t, 'hostile');
```

becomes

```ts
  if (t.iffNeg && t.side === 'hostile') setIdent(sim, t, 'hostile');
```

`lib/ddi/draw.ts` (`hafu`): change the doc comment's tail from `box = unknown, box + bold top = ambiguous. */` to `box = unknown. */` and delete the line

```ts
  if (ident === 'ambiguous') ctx.fillRect(x - s, y - s * 1.15, s * 2, s * 0.3);
```

- [ ] **Step 4: Update the ident lesson and copy**

`lib/lessons/lessons.ts`, ident lesson:

First step text, replace
`'Trackfile symbols (HAFU) show identity by shape: open box = unknown; box with a bold top = ambiguous (no IFF reply); arc = friendly; chevron = hostile.'`
with
`'Trackfile symbols (HAFU) show identity by shape: open box = unknown, arc = friendly, chevron = hostile. (A box with a bold top, ambiguous, means your ID and a datalink donor\'s disagree; the trainer has no datalink.)'`

Third step condition, replace

```ts
        until: (s) => s.targets.every((t) => t.ident !== 'unknown'),
```

with

```ts
        until: (s) => s.targets.every((t) => t.ident === 'friendly' || t.iffNeg),
```

Fourth step text, replace
`"The friendly replied: arc. The other stayed silent: ambiguous. Silence alone isn't proof. Lock it`
with
`"The friendly replied: arc. The other stayed silent and is still an open box: as in DCS, silence alone proves nothing. Lock it`
(the rest of the sentence stays).

Last step text, replace
`Anything else stays unknown or ambiguous, and the ID is advice`
with
`Anything else stays unknown, and the ID is advice`

`components/sections/HowItWorks.tsx` (ident topic): replace

```tsx
            Pressing the castle switch interrogates (<Term t="IFF" />) the aircraft under the cursor. A friendly&apos;s transponder replies; silence
            makes a contact <em>ambiguous</em>, not hostile. In STT, <Term t="NCTR" /> (non-cooperative target recognition) can identify the
            engine type of a nose-on target inside about 25 nm; an ambiguous contact with a hostile type becomes{' '}
            <em>hostile</em>. The <Term t="HAFU">HAFU symbols</Term> show identity by shape:
```

with

```tsx
            Pressing the castle switch interrogates (<Term t="IFF" />) the aircraft under the cursor. A friendly&apos;s transponder replies; silence
            leaves the contact <em>unknown</em>, not hostile. In STT, <Term t="NCTR" /> (non-cooperative target recognition) can identify the
            engine type of a nose-on target inside about 25 nm; a contact that gave no IFF reply and prints a hostile type becomes{' '}
            <em>hostile</em>. <em>Ambiguous</em> means your ID and a datalink donor&apos;s disagree, which needs datalink (not simulated).
            The <Term t="HAFU">HAFU symbols</Term> show identity by shape:
```

`docs/USER_GUIDE.md`: replace
`open box = unknown, box with bold top = ambiguous (no IFF reply), arc = friendly,`
with
`open box = unknown (also after an unanswered IFF interrogation), arc = friendly,`

`docs/research/apg-73.md` §7 classification table: replace

```markdown
| Ambiguous | Negative IFF reply |
```

with

```markdown
| Ambiguous | Own ID and a datalink donor's ID conflict [D CHK p636]. (Our earlier Hoggit reading, "negative IFF reply", was wrong: a negative reply alone leaves the track unknown [D CHK p639].) |
```

and

```markdown
| Unknown | Default |
```

with

```markdown
| Unknown | Default, including after a negative IFF reply with no other evidence [D CHK] |
```

- [ ] **Step 5: Run all tests and the type check**

Run: `npm test` then `npx tsc --noEmit -p .`
Expected: 117 pass, 0 fail (the ident walkthrough completes; free play's `t.ident === t.side` check is unchanged); tsc exit 0. If tsc reports `'ambiguous'` anywhere, delete that branch: nothing produces it any more.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/types.ts lib/sim/world.ts lib/sim/ident.ts lib/ddi/draw.ts lib/sim/ident.test.ts lib/lessons/lessons.ts components/sections/HowItWorks.tsx docs/USER_GUIDE.md docs/research/apg-73.md
git commit -m "fix: an unanswered IFF leaves the HAFU unknown, as in DCS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ACM page (RTS, boxed ACM) and TDC assignment

**Files:**
- Modify: `lib/sim/radar.ts` (`enterAcm`), `lib/sim/pushbuttons.ts` (ACM branch)
- Test: `lib/sim/pushbuttons.test.ts`, `lib/ddi/draw.test.ts`
- Copy: `components/sections/ControlsReference.tsx`, `docs/research/apg-73.md`

**Interfaces:**
- Consumes: `undesignate(sim)` from `radar.ts` (in ACM it returns to search and pushes an `rts` event).
- Produces: in ACM, `pushbuttons(sim)[5]` = `{ label: 'RTS\n<searchMode>', press }`, `[7]` = `{ label: 'ACM', boxed: true }`; entering ACM sets `radar.tdc = true`.

- [ ] **Step 1: Write the failing tests**

In `lib/sim/pushbuttons.test.ts`, replace the test `'in ACM, PB5 shows the ACM sub-mode and the search controls disappear'` with:

```ts
test('ACM takes the TDC; PB5 is RTS, a boxed ACM legend replaces SIL, and the search controls disappear', () => {
  const s = createSim();
  s.radar.tdc = false;
  castle(s, 'fwd');
  assert.equal(s.radar.tdc, true);
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'RTS\nRWS');
  assert.deepEqual([pbs[7].label, pbs[7].boxed], ['ACM', true]);
  assert.equal(pbs[19], undefined);
  assert.equal(pbs[11], undefined);
  pbs[5].press!();
  assert.equal(s.radar.mode, 'RWS');
});
```

In `lib/ddi/draw.test.ts`, replace the test `'ACM frame shows the sub-mode legend and no cursor altitude numbers'` with:

```ts
test('ACM frame shows RTS and the boxed ACM legend, and no search options', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'fwd');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['RTS', 'RWS', 'ACM']) assert.ok(texts.includes(want), `missing ${want}`);
  assert.ok(!texts.includes('ERASE'));
  assert.ok(!texts.includes('SIL'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/sim/pushbuttons.test.ts lib/ddi/draw.test.ts`
Expected: FAIL (`tdc` stays false; PB5 label is `'BST'`; `SIL` is drawn).

- [ ] **Step 3: Implement**

`lib/sim/radar.ts`, in `enterAcm`, after `r.antenna.bar = 0;` add

```ts
  r.tdc = true; // ACM assigns the TDC to the Attack format
```

`lib/sim/pushbuttons.ts`: change the import to

```ts
import { azOptions, barOptions, breakLock, clipScan, cycle, rset, setSearchMode, sttToTws, undesignate } from './radar.ts';
```

and replace

```ts
  if (r.mode === 'ACM') {
    pbs[5] = { label: r.acm ?? 'ACM' };
    pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
    return pbs;
  }
```

with

```ts
  if (r.mode === 'ACM') {
    // As in DCS: RTS replaces the mode and a boxed ACM legend replaces SIL; the sub-mode shows on the HUD
    pbs[5] = { label: `RTS\n${r.searchMode}`, press: () => undesignate(sim) };
    pbs[7] = { label: 'ACM', boxed: true };
    return pbs;
  }
```

- [ ] **Step 4: Update the copy**

`components/sections/ControlsReference.tsx`: replace

```ts
  ['PB5', 'RWS → TWS', 'TWS → RWS', 'RTS (back to search)', 'Shows the ACM sub-mode', '—'],
```

with

```ts
  ['PB5', 'RWS → TWS', 'TWS → RWS', 'RTS (back to search)', 'RTS (back to search)', '—'],
```

and

```ts
  ['PB7', 'SIL (silent)', 'SIL', 'SIL', 'SIL', '—'],
```

with

```ts
  ['PB7', 'SIL (silent)', 'SIL', 'SIL', 'ACM (boxed legend)', '—'],
```

`docs/research/apg-73.md`, ACM section: after the line starting `**Exiting ACM:** Undesignate or RTS.` add

```markdown

**ACM display:** RTS plus the search mode at PB5 and a boxed ACM legend at PB7 (no SIL); the sub-mode is shown on the HUD. Entering ACM assigns the TDC to the Attack format [D CHK p217].
```

- [ ] **Step 5: Run all tests and the type check**

Run: `npm test` then `npx tsc --noEmit -p .`
Expected: 117 pass, 0 fail; tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/radar.ts lib/sim/pushbuttons.ts lib/sim/pushbuttons.test.ts lib/ddi/draw.test.ts components/sections/ControlsReference.tsx docs/research/apg-73.md
git commit -m "fix: ACM page shows RTS and a boxed ACM legend, and takes the TDC" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Castle switch: AACQ waits for a contact; left/aft hand the TDC away

**Files:**
- Modify: `lib/sim/types.ts` (`Radar.aacq`), `lib/sim/radar.ts` (`defaultRadar`, `lock`, `enterAcm`, `towardRadar`, `castle`, `stepRadar`), `lib/ddi/draw.ts`, `lib/ddi/hud.ts`
- Test: `lib/sim/acquisition.test.ts`, `lib/sim/acm-mode.test.ts`, `lib/ddi/draw.test.ts`
- Copy: `components/sections/Glossary.tsx`, `components/sections/KeyBindings.tsx`, `components/sections/FromDcs.tsx`, `docs/USER_GUIDE.md`, `docs/research/apg-73.md`

**Interfaces:**
- Produces: `Radar.aacq: boolean` (armed Automatic Acquisition). Set by castle right when nothing is under the cursor, there is no L&S and no rank-1 trackfile; cleared by `lock`, `enterAcm`, castle left/aft.

- [ ] **Step 1: Write the failing tests**

In `lib/sim/acquisition.test.ts`, after the existing AACQ test, add:

```ts
test('AACQ with nothing to lock arms, then locks the first contact the scan finds; castle aft cancels it', () => {
  const s = createSim({ seed: 3, own: { spd: 300 }, targets: [makeTarget({ id: 'A', x: 0, y: 30, spd: 300 })] });
  setPower(s, 'OPR');
  castle(s, 'right'); // the TDC is already on the radar: this is AACQ
  assert.equal(s.radar.aacq, true);
  assert.equal(s.radar.mode, 'RWS');
  run(s, 20);
  assert.equal(s.radar.stt?.targetId, 'A');
  assert.equal(s.radar.aacq, false);

  const c = createSim();
  setPower(c, 'OPR');
  castle(c, 'right');
  castle(c, 'aft');
  assert.equal(c.radar.aacq, false);
});
```

In `lib/sim/acm-mode.test.ts`, replace the test `'castle aft/left do nothing outside ACM'` with:

```ts
test('outside ACM, castle left / aft hand the TDC to another display', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 20 }));
  castle(s, 'left');
  assert.equal(s.radar.tdc, false);
  assert.equal(s.radar.mode, 'RWS');
  castle(s, 'right');
  assert.equal(s.radar.tdc, true);
  castle(s, 'aft');
  assert.equal(s.radar.tdc, false);
});
```

In `lib/ddi/draw.test.ts`, add:

```ts
test('an armed AACQ shows its legend', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'right');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('AACQ'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/sim/acquisition.test.ts lib/sim/acm-mode.test.ts lib/ddi/draw.test.ts`
Expected: FAIL (`aacq` is `undefined`; `tdc` stays true after castle left; no `AACQ` text).

- [ ] **Step 3: Implement**

`lib/sim/types.ts`, in `Radar`, after `tdc: boolean; ...` add

```ts
  aacq: boolean; // Automatic Acquisition armed: lock the closest contact as soon as the scan finds one
```

`lib/sim/radar.ts`:

In `defaultRadar`, replace `tdc: true, ltws: true,` with `tdc: true, aacq: false, ltws: true,`.

In `lock`, after `r.acm = null;` add `r.aacq = false;`.

In `enterAcm`, after the `r.tdc = true;` line from Task 3 add `r.aacq = false;`.

Replace the whole `towardRadar` function and its doc comment with

```ts
/** Castle right, toward the radar display (the right DDI in the jet). The first press takes the TDC.
 *  With the TDC, in search: Automatic Acquisition. The symbol under the cursor (Fast Acq), else the L&S, else the
 *  closest trackfile goes to STT; with none yet, AACQ arms and locks the first contact the scan finds. */
function towardRadar(sim: Sim) {
  const r = sim.radar;
  if (!r.tdc) {
    r.tdc = true;
    return;
  }
  if ((r.mode !== 'RWS' && r.mode !== 'TWS') || !transmitting(r)) return;
  const id = pickTarget(sim) ?? r.ls ?? r.tracks.find((tr) => tr.rank === 1)?.targetId;
  if (id) lock(sim, id);
  else r.aacq = true;
}
```

Replace the whole `castle` function and its doc comment with

```ts
/** Sensor Control Switch (castle).
 *  Forward: ACM Boresight.
 *  Inside ACM: aft = Vertical acquisition, left = Wide acquisition.
 *  Outside ACM: right takes the TDC, then Automatic Acquisition; left / aft give the TDC to the left DDI / AMPCD
 *  (not simulated: the radar just loses it) and cancel AACQ. */
export function castle(sim: Sim, dir: 'fwd' | 'aft' | 'left' | 'right') {
  const r = sim.radar;
  if (dir === 'fwd') return enterAcm(sim, 'BST');
  if (r.mode === 'ACM') {
    if (dir === 'aft') enterAcm(sim, 'VACQ');
    else if (dir === 'left') enterAcm(sim, 'WACQ');
    return;
  }
  if (dir === 'right') return towardRadar(sim);
  r.tdc = false;
  r.aacq = false;
}
```

In `stepRadar`, after `rankTracks(sim);` add

```ts
  // AACQ armed: lock the closest contact as soon as the scan has one
  const first = r.aacq ? r.tracks.find((tr) => tr.rank === 1) : undefined;
  if (first && transmitting(r) && (r.mode === 'RWS' || r.mode === 'TWS')) lock(sim, first.targetId);
```

`lib/ddi/draw.ts`: after

```ts
  text(r.power === 'OPR' && r.sil ? 'SIL' : r.power, X(0), top);
```

add

```ts
  if (r.aacq) text('AACQ', X(0) + fs * 3.5, top);
```

`lib/ddi/hud.ts`: replace

```ts
  ctx.fillText(r.mode === 'ACM' ? (r.acm ?? 'ACM') : r.mode, size * 0.05, size * 0.06);
```

with

```ts
  ctx.fillText(r.aacq ? 'AACQ' : r.mode === 'ACM' ? (r.acm ?? 'ACM') : r.mode, size * 0.05, size * 0.06);
```

- [ ] **Step 4: Update the copy**

`components/sections/Glossary.tsx`: replace
`'Automatic Acquisition: castle toward the radar display locks the contact under the cursor (Fast Acq), else the L&S, else the #1 trackfile.'`
with
`'Automatic Acquisition: castle toward the radar display locks the contact under the cursor (Fast Acq), else the L&S, else the closest trackfile; with none yet it arms ("AACQ") and locks the first contact the scan finds.'`

`components/sections/KeyBindings.tsx`: replace

```ts
      ['castleAft', 'Castle aft', 'In ACM: Vertical acquisition'],
      ['castleLeft', 'Castle left', 'In ACM: Wide acquisition'],
      ['castleRight', 'Castle right', 'Take the TDC (the diamond); then lock what is under the cursor, else the ★, else the #1 trackfile (AACQ)'],
```

with

```ts
      ['castleAft', 'Castle aft', 'In ACM: Vertical acquisition; otherwise hands the TDC away and cancels AACQ'],
      ['castleLeft', 'Castle left', 'In ACM: Wide acquisition; otherwise hands the TDC away'],
      ['castleRight', 'Castle right', 'Take the TDC (the diamond); then lock what is under the cursor, else the ★, else the closest trackfile, else wait for one (AACQ)'],
```

`components/sections/FromDcs.tsx`, first FAQ answer: replace
`(right in DCS, where the radar sits on the right DDI; L here) to take it.'`
with
`(right in DCS, where the radar sits on the right DDI; L here) to take it. Castle left or aft hands it to another display, here as in DCS.'`

`docs/USER_GUIDE.md`: replace
`forward = ACM, right = take the TDC / lock (AACQ), left = WACQ, aft = VACQ, press = IFF.`
with
`forward = ACM, right = take the TDC / lock (AACQ), left = WACQ in ACM (otherwise hands the TDC away), aft = VACQ in ACM (otherwise hands the TDC away), press = IFF.`

and replace the two lines

```markdown
- **Automatic Acquisition.** Castle right (`L`) with the TDC already taken locks the contact under the cursor (Fast
  Acquisition), else the ★, else the #1-ranked trackfile.
```

with

```markdown
- **Automatic Acquisition.** Castle right (`L`) with the TDC already taken locks the contact under the cursor (Fast
  Acquisition), else the ★, else the closest trackfile. With nothing to lock yet, **AACQ** shows and the radar locks the
  first contact it finds; castle aft (`K`) cancels it.
```

`docs/research/apg-73.md`, AACQ section: after `The 2018 guide says the fallback is the closest target instead [D DCS-EA].` add

```markdown

With nothing to lock, AACQ stays armed ("AACQ" top-left on the DDI and on the HUD) and locks the closest contact the scan detects. Sensor Control Switch aft exits it [D CHK pp. 202, 227].
```

- [ ] **Step 5: Run all tests and the type check**

Run: `npm test` then `npx tsc --noEmit -p .`
Expected: 119 pass, 0 fail (the AWACS walkthrough still locks with castle right on the brick); tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/types.ts lib/sim/radar.ts lib/ddi/draw.ts lib/ddi/hud.ts lib/sim/acquisition.test.ts lib/sim/acm-mode.test.ts lib/ddi/draw.test.ts components/sections/Glossary.tsx components/sections/KeyBindings.tsx components/sections/FromDcs.tsx docs/USER_GUIDE.md docs/research/apg-73.md
git commit -m "fix: AACQ arms and waits for a contact; castle left/aft hand the TDC away" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Readouts: altitude to 0.1, speed over Mach, TWS cursor data, HUD diamond

**Files:**
- Modify: `lib/ddi/draw.ts`, `lib/ddi/hud.ts`
- Test: `lib/ddi/draw.test.ts`, `lib/ddi/hud.test.ts`
- Copy: `docs/research/apg-73.md`

**Interfaces:**
- Consumes: `pickTarget(sim): string | null` from `lib/sim/radar.ts` (the trackfile or brick under the cursor).

- [ ] **Step 1: Write the failing tests**

In `lib/ddi/draw.test.ts`:
- in `'STT frame draws the L&S star, RTS and target data'` change `'25'` to `'25.0'` in the `want` list;
- in `'TWS frame draws ranked trackfiles, the L&S star and its data'` change `'24'` to `'24.0'`;
- change the geometry import (add one if absent) to `import { range, relAz, toBscope } from '../sim/geometry.ts';`
- add:

```ts
test('TWS shows Mach and altitude for the trackfile under the cursor too', () => {
  const s = createSim({ targets: [makeTarget({ id: 'B', x: 3, y: 25, alt: 31000 })] });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  updateTrack(s.radar, s.targets[0], 0);
  rankTracks(s);
  const a = fakeCtx();
  drawDdi(a.ctx, s, 600, 'monospace');
  assert.ok(!a.texts.includes('31.0'));
  s.radar.cursor = toBscope(relAz(s.own, s.targets[0]), range(s.own, s.targets[0]), s.radar.rangeScale);
  const b = fakeCtx();
  drawDdi(b.ctx, s, 600, 'monospace');
  assert.ok(b.texts.includes('31.0'));
});
```

In `lib/ddi/hud.test.ts`, add:

```ts
test('HUD target designator: square for unknown or friendly, diamond for hostile', () => {
  const s = scene();
  lock(s, 'T');
  const a = fakeCtx();
  drawHud(a.ctx, s, 300, 'monospace');
  assert.ok(a.calls.includes('rect'));
  s.targets[0].ident = 'hostile';
  const b = fakeCtx();
  drawHud(b.ctx, s, 300, 'monospace');
  assert.ok(!b.calls.includes('rect'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/ddi/draw.test.ts lib/ddi/hud.test.ts`
Expected: FAIL (`missing 25.0`, `missing 24.0`, no `31.0` under the cursor, no `rect` call).

- [ ] **Step 3: Implement**

`lib/ddi/draw.ts`:

Change the radar import to

```ts
import { pickTarget, shownTracks, transmitting } from '../sim/radar.ts';
```

Replace

```ts
  text(`M ${mach(own.spd, own.alt).toFixed(2)}\n${Math.round(own.spd)}`, X(0), bottom);
```

with

```ts
  text(`${Math.round(own.spd)}\nM ${mach(own.spd, own.alt).toFixed(2)}`, X(0), bottom);
```

In `symbol`, replace

```ts
      text(String(Math.round(k.alt / 1000)), x + s * 1.4, y - s * 0.5);
```

with

```ts
      text((k.alt / 1000).toFixed(1), x + s * 1.4, y - s * 0.5);
```

In the RWS/TWS branch, replace

```ts
  } else if (r.mode === 'RWS' || r.mode === 'TWS') {
    for (const tr of shownTracks(sim)) {
```

with

```ts
  } else if (r.mode === 'RWS' || r.mode === 'TWS') {
    const tuc = pickTarget(sim);
    for (const tr of shownTracks(sim)) {
```

and

```ts
      // RWS only shows designated or LTWS-previewed trackfiles, all with their data
      const y = symbol(k, t.ident, center, r.mode === 'RWS' || tr.targetId === r.ls || tr.targetId === r.dt2);
```

with

```ts
      // RWS only shows designated or LTWS-previewed trackfiles, all with their data; TWS adds data to the ★, the ◇ and the one under the cursor
      const y = symbol(k, t.ident, center, r.mode === 'RWS' || [r.ls, r.dt2, tuc].includes(tr.targetId));
```

`lib/ddi/hud.ts`: replace

```ts
    if (inView(g.az, g.el)) {
      const b = size * 0.05;
      ctx.strokeRect(X(g.az) - b, Y(g.el) - b, 2 * b, 2 * b);
    }
```

with

```ts
    if (inView(g.az, g.el)) {
      // target designator: a diamond on a hostile, a square otherwise
      const b = size * 0.05;
      const x = X(g.az);
      const y = Y(g.el);
      ctx.beginPath();
      if (locked.ident === 'hostile') {
        ctx.moveTo(x, y - b * 1.4);
        ctx.lineTo(x + b * 1.4, y);
        ctx.lineTo(x, y + b * 1.4);
        ctx.lineTo(x - b * 1.4, y);
        ctx.closePath();
      } else ctx.rect(x - b, y - b, 2 * b, 2 * b);
      ctx.stroke();
    }
```

- [ ] **Step 4: Update the research record**

`docs/research/apg-73.md`, HAFU labels: replace
`- **Labels on the L&S / DT2:** Mach to the left, altitude (thousands of feet) to the right.`
with
`- **Labels on the L&S / DT2 and the trackfile under the cursor:** Mach to the left, altitude in thousands of feet to one decimal (e.g. 6.5) to the right [D CHK pp. 205, 208].`
(keep the rest of that bullet).

- [ ] **Step 5: Run all tests and the type check**

Run: `npm test` then `npx tsc --noEmit -p .`
Expected: 121 pass, 0 fail; tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/ddi/draw.ts lib/ddi/hud.ts lib/ddi/draw.test.ts lib/ddi/hud.test.ts docs/research/apg-73.md
git commit -m "fix: DCS readouts: altitude to 0.1, speed over Mach, TWS cursor data, hostile TD diamond" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Leave-outs list and whole-site verification

**Files:**
- Copy: `components/sections/FromDcs.tsx`

- [ ] **Step 1: Update the leave-outs answer**

`components/sections/FromDcs.tsx`, last FAQ answer: replace
`'Weapons (the AIM-120 and its launch zone are planned next), datalink and the SA and Az/El pages, the VS, RAID and Spotlight modes, and bandits that react to your lock. The radar numbers are simplified public estimates.'`
with
`'Weapons (the AIM-120 and its launch zone are planned next), datalink and the SA and Az/El pages, the VS, RAID, EXP and Spotlight modes, BIAS scan centring, uncaged WACQ, gun and helmet acquisition, and bandits that react to your lock. The radar numbers are simplified public estimates.'`

- [ ] **Step 2: Run every check**

Run: `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, `npm run build`
Expected: 121 pass, 0 fail; tsc exit 0; lint clean; build writes `out/`.

- [ ] **Step 3: Check it in the browser**

Start the dev server with `preview_start` using the `web` configuration from `.claude/launch.json`. In the sandbox cockpit:
1. RADAR knob to OPR, PB5 to TWS: PB19 reads 40°, PB6 reads 4B. Press PB19: 60° and 2B.
2. Press J (castle left): the diamond at the top right of the DDI disappears and W/A/S/D no longer move the cursor. Press L: it comes back.
3. With nothing painted, press L again: "AACQ" appears top-left on the DDI.
4. Press I (castle forward): PB5 reads RTS / TWS, a boxed ACM sits at PB7, the HUD reads BST. Click PB5: back to TWS.
5. Read the console: no errors.
Take one screenshot of step 4 as proof.

- [ ] **Step 4: Commit**

```bash
git add components/sections/FromDcs.tsx
git commit -m "docs: list the DCS radar features the trainer leaves out" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
