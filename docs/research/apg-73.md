# AN/APG-73 (F/A-18C/D Hornet): factual baseline for the radar trainer

_Compiled 2026-09-29 from web research. Backs the design in
`docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md`._

## How to read this document

**Confidence labels.** Every claim carries one, plus a source tag that maps to a URL in §10.
- **[V]**: official, government, manufacturer, DTIC or industry-analyst source.
- **[D]**: Eagle Dynamics DCS documentation. DCS models a USN **Lot 20** F/A-18C [RAeS], and its documentation is the only complete public description of how the display and HOTAS behave.
- **[S]**: secondary source.
- **ESTIMATE**: our own derivation.

**Main caveat.** The real A/A tactical manual is not public, so almost all display and HOTAS detail comes from DCS. Where DCS editions disagree, this document says so: the 2018 Early Access Guide versus the current Hoggit wiki.

**Research limits.** Two large PDFs could not be machine-read: the full NATOPS A1-F18AC-NFM-000 [NFM000] and the current 21 MB DCS guide. We used these instead:
- the NATOPS pocket checklist [NFM500];
- the 2018 DCS Early Access Guide [DCS-EA];
- the Hoggit wiki, as the current DCS reference [HOG];
- DCS screenshots hosted on Hoggit [HOG-IMG];
- DTIC, DOT&E and Forecast International reports.

**Screenshot check.** A DCS screenshot of the RWS pushbutton layout was checked by eye and matches §5 (`RDR_ATTK_Common_Labels_1.png`).

---

## 1. Overview

### Lineage: Hughes (now Raytheon) APG-65 → APG-73 → APG-79 (AESA)

**APG-65.** Hughes was selected for the APG-65 in 1976, and it reached IOC around 1982 [V FI65].

**APG-73 = "Radar Upgrade (RUG) Phase I"** [V FI73, DOTE97]
- Work began in 1988, and full-scale development was approved in 1989 as a US–Canada co-development.
- First flight test was spring 1992 (FI gives both March and April).
- First production radar delivered 30 Jul 1993; the first two operational F/A-18s arrived May 1994; fleet service from late 1994 [V FI73].
- Raytheon and Wikipedia say "operational since 1992" [RTN06, WP]. That conflicts with FI, so use 1993–94 for fielding.

**Operational evaluation (OPEVAL, OT-IIC)** ended in 1996 [V DOTE97].
- 397 flight hours, 297 sorties and 8 missile firings.
- Rated effective and suitable, although some classified parameters were deficient.
- Full-rate production approved in October 1996.

**RUG Phase II**
- Added high-resolution SAR mapping for reconnaissance and autonomous JSOW/JDAM targeting [V DOTE97].
- Hardware added: an inertial sensor at the radar, a stretch-generator module and a reconnaissance/test module [V FI73].
- Service: USMC F/A-18D(RC) in 1997; standard in 1999 [V FI73].

**Phase III (AESA)** became the APG-79. Raytheon was selected in November 1999 and deliveries started in 2004 [V FI73].

**End of production.** The last APG-73 was delivered in June 2006. 932 were built, at about $2.5M each [V RTN06, FI73].

### What changed vs the APG-65 [V FI73, GS65]

- **Kept:** the same antenna and the same TWT transmitter.
- **Processing:** one new radar data processor replaced the separate signal and data processors.
  - Signal processing rose from 7.2 to 60 MOPS.
  - The 1750A computer runs at more than 2 MIPS with 2M words of memory.
- **Power supply:** solid-state.
- **Receiver/exciter:** an MMIC design.
- **A/D converters:** 11-bit at 5 MHz (A/A) and 6-bit at 58 MHz (A/G), up from 1.3 and 8 MHz [FI65].
- **Performance:** more bandwidth, more frequency agility, better Doppler resolution, better ECCM.
- ED, citing Stimson, puts the high-PRF FFT at 2048 points, up from 1024 [S EDWP].

### Type and antenna

**Type.** X/I-band (8–12 GHz), coherent pulse-Doppler, multimode, look-down/shoot-down radar [V WP, FI73; D DCS-EA]. The antenna is a mechanically scanned, low-sidelobe planar (slotted) array with direct electric drive [V RTX, FI65, IDA83; S EDWP].

**Gimbal limits**
- **Azimuth ±70°.** IDA83 describes a "wide AZ scan ±70°", and the DCS tactical region also spans ±70° [D HOG].
- **Elevation ±60°.** From the DCS elevation caret [D HOG] and [S WT]. No public official figure.

### Platforms and operators [V WP, FI73, RTN06; TWZ]

- USN/USMC F/A-18C/D, both new production and retrofits (e.g. USMC ECP-583).
- Early F/A-18E/F (Block I) and the F/A-18D(RC).
- Finland (1995), Switzerland (1995), Malaysia (1996), Canada, and Australia (71 aircraft, 2000–02).
- Later replaced by the APG-79. Some USMC legacy Hornets were re-radared with the APG-79(V)4 [TWZ].

### Key numbers

| Number | Value | Status |
|---|---|---|
| Antenna diameter | 26.625 in (APG-65, same antenna) [IDA83]; 0.675 m [EDWP]; FI says ~28 in | Verified-ish, FI conflicts |
| Beamwidth | ~3.3°: IDA83 gives 3.3° as the real-beam effective width; the DCS BST scan is also 3.3° | Verified-ish |
| Weight | ~154 kg / 340 lb without the rack (FI table, garbled); APG-65 in 1983: 393 lb [IDA83] | Unverified |
| Power | ~9 kW prime power; ~4.5 kW transmitter input [EDWP] | Secondary |
| TWS capacity | Maintains 10 tracks, displays 8 [IDA83, FI65, FI73] | Verified |
| Instrumented range | 200 ft – 160 nm [IDA83] | Verified |
| Detection range | ">100 miles" (Hughes) [GSCD]; ">60 nm" [FI73]; ED's estimate against a 5 m² target: ~65 nm in HPRF, ~30 nm in MPRF [EDWP] | Unverified; use ED's figures as the ESTIMATE |

---

## 2. Radar power & states

**RADAR knob** (right-console sensor panel) [D HOG]

| Position | Function | Display |
|---|---|---|
| OFF | Removes all radar power [D DCS-EA] | Not documented. ESTIMATE: "OFF" + Iron Cross |
| STBY | All power on except high voltage, for warm-up or ready-to-transmit [D DCS-EA] | Status "STBY" [D DCS-EA] |
| OPR | Full operation once the safety interlocks and initial warm-up are met; a failsafe can shut it down [D DCS-EA, HOG] | Status "OPR" + channel (e.g. "C11"), top-left [D HOG-IMG] |
| PULL EMERG | Operates and ignores the failsafes; only a physical failure stops it [D HOG] | Not documented. ESTIMATE: "OPR" |

**Warm-up.** A warm-up period exists, but its duration isn't published [D DCS-EA]. The trainer doesn't simulate it: the jet air-starts in STBY with the radar already warm.

**Weight on wheels.** The radar never scans on the ground, whatever the knob position [D HOG].

**Checklist use** [V NFM500]
- Before taxi: radar OPERATE.
- Before air-refuelling plug-in: STBY / SILENT / EMCOM.
- Double generator failure: radar OFF.

**SIL (PB7)** [D DCS-EA, HOG]
- Stops scanning and boxes the SIL legend.
- The "Iron Cross" (radar not active) appears at lower-left. It also appears with weight on wheels or with the radar off.
- The SIL sub-level has an ACTIVE option that transmits for one frame, then returns to silent.

---

## 3. Air-to-air modes

### RWS (Range While Search)

- **Purpose.** The default search mode: all aspects, all altitudes, high and medium PRF [D DCS-EA; V FI73].
- **Display.** Raw hits appear as green "bricks" that fade with age. Up to 10 trackfiles and 64 hits [D HOG, DCS-EA].
- **HAFU symbols in RWS** appear only for [D HOG]:
  - the L&S and DT2;
  - targets under AMRAAM attack;
  - datalink tracks, when MSI is on;
  - tracks under the cursor, when LTWS is on.
- **Options.** ERASE (PB8). SET (PB13) saves azimuth, bars, PRF, range and aging to the selected weapon [D HOG].
- **Limitation.** Bricks carry no heading or speed.

### LTWS (Latent TWS)

- On by default in DCS [D HOG].
- Putting the cursor on a brick shows its trackfile (HAFU, Mach, altitude, launch zone) and makes it designatable [D HOG].
- The 2018 guide says there is no SHOOT cue in LTWS [D DCS-EA].
- **With LTWS off, a TDC press on a brick goes straight to STT** [D HOG; S VRS]. With LTWS on, the first press designates the trackfile (L&S/DT2) and a press on the L&S locks. The trainer models both, LTWS on by default (DATA PB15).
- **Automatic Acquisition (AACQ).** Castle toward the Attack format with the TDC already assigned: the trackfile or brick under the cursor (Fast Acq), else the L&S, else the #1-ranked trackfile goes to STT [D HOG]. With none of these, AACQ stays armed until the scan finds a contact [D CHK]. The first castle press toward a display only assigns the TDC (diamond, top-right) [D HOG].

**No "SAM" mode on the Hornet.** No Hornet source for one was found; it is an F-16 / APG-68 term. The Hornet equivalents are LTWS and Spotlight.

### TWS (Track While Scan)

The multi-target / AMRAAM mode [V FI73; D HOG].

**Scan volume.** Restricted to 160°-bars or less [D CHK p209, with a worked example; Hoggit's 80/60/40° table is superseded]:

| Bars | Max azimuth |
|---|---|
| 2 | 80° |
| 4 | 40° |
| 6 | 20° |

Minimum width is 20°, and neither 1 bar nor 140° is allowed. Raising one setting lowers the other if needed. Entering TWS keeps the bars (1B becomes 2B) and narrows the azimuth [D CHK].

**Display.** Every trackfile appears as a HAFU. HITS (PB8) adds the associated bricks with a fixed 2 s aging [D HOG].

**Capacity.** Up to 8 ranked tracks plus the L&S and DT2 [D HOG]. The real radar maintains 10 and displays 8 [V IDA83].

**Scan centering (PB13)** [D HOG]
- **MAN:** pressing the TDC on empty space sets the scan center.
- **AUTO:** the scan center and elevation follow the L&S and DT2. If the L&S is lost, MAN is entered automatically [D CHK p212].
- **BIAS:** a TDC press on empty space in AUTO shifts the scan toward that azimuth, keeping the L&S and DT2 inside [D CHK p212]. Hoggit called it unimplemented. Not simulated.
- MAN is the default. Entering TWS from STT gives AUTO.

**EXP (PB20)** zooms the display to ±10° / ±5 nm around the L&S. It changes the display only [D HOG].

### VS (Velocity Search)

- HPRF only. The vertical axis shows closure instead of range, and targets appear as bricks only.
- Gives the longest detection range against nose-on targets [V FI73, FI65; D HOG].
- Listed as not implemented on Hoggit [D HOG].

### STT (Single Target Track)

Continuous track on one target [D HOG].
- The target becomes the L&S, and the other radar trackfiles are deleted.
- The B-sweep freezes on the target, and the elevation caret becomes body-referenced.
- **ARSA** (automatic range scaling) keeps the target at 40–90% of the range scale.
- **MEM** re-acquires after an uncommanded lock loss; the target box becomes hashed.
- **NCTR (PB15)** gives a type "print" from jet-engine modulation.
- The AIM-7 needs STT, except in FLOOD or home-on-jam [D DCS-EA].

### RAID

Selected with the throttle RAID switch or PB9 [D HOG].
- **From TWS:** SCAN RAID, a 22° × 3-bar scan centered on the L&S, with the display expanded like EXP.
- **From STT:** STT RAID, which alternates between track and search.
- **Real purpose:** expands the area around a tracked target to resolve close formations [V FI73, FI65].

### ACM (close-in auto-acquisition)

Each mode auto-locks the first target inside its range gate [D HOG].

| Mode | Entry | Scan (DCS) | Range gate |
|---|---|---|---|
| BST (boresight) | Sensor Control Switch fwd. Becomes HACQ with a helmet sight; hold >0.8 s for LHAQ (40 nm) | ~3.3° circle, ±1.7° vertical, MPRF | 10 nm |
| VACQ (vertical) | Sensor Control Switch aft | 6° wide, −13° to +46° elevation | 5 nm |
| WACQ (wide) | Sensor Control Switch left | 60° wide, +6° to −9°; Cage/Uncage toggles caged/uncaged | 10 nm |
| GACQ (gun) | Selecting the gun | 20° wide, +6° to −14° (2018 guide: 5 bars, 20° tall, centered 4° low) | 5 nm |

**Discrepancies**
- FI gives 500 ft to 5 nm for boresight, vertical and gun acquisition, and 10 nm for wide [V FI65].
- VRS gives VACQ as ±3.1° azimuth, from −13° to +47° [S VRS].
- Sensor Control Switch right while in ACM: the 2018 guide says it returns to search [D DCS-EA]. Current behavior is undocumented.

**Exiting ACM:** Undesignate or RTS. Gun acquisition has no return to search while the gun is selected [D HOG].

**ACM display:** RTS plus the search mode at PB5 and a boxed ACM legend at PB7 (no SIL); the sub-mode is shown on the HUD. Entering ACM assigns the TDC to the Attack format [D CHK p217].

### AACQ (automatic acquisition)

Bump the Sensor Control Switch toward the display that already owns the TDC [D HOG]. It locks, in priority order:
1. the target under the cursor ("Fast Acq");
2. the L&S;
3. the #1-ranked track (the fastest in VS).

The 2018 guide says the fallback is the closest target instead [D DCS-EA].

With nothing to lock, AACQ stays armed ("AACQ" top-left on the DDI; DCS also shows it on the HUD, which the trainer only draws in ACM and STT) and locks the closest contact the scan detects. Sensor Control Switch aft exits it [D CHK pp. 202, 227].

### Spotlight (2018 guide)

Hold the TDC for more than 1 s to get a 22° scan around the cursor, with "SPOT" shown at bottom-center. Undesignate exits it [D DCS-EA; S VRS].

### Weapon selection vs radar

- Selecting a weapon enters A/A master mode and puts the radar on the right DDI [D HOG].
- The gun commands ACM with gun acquisition [D HOG].
- The 2018 guide: each weapon loads default radar settings; SET saves them and RESET restores them [D DCS-EA].
- **Reported defaults** (low trust; from a user-made HOTAS document seen only as a search excerpt [S HOTASDOC]):

  | Weapon | Bars | Azimuth | Range | PRF |
  |---|---|---|---|---|
  | AIM-7 | 4 | 140° | 40 nm | INTL |
  | AIM-9 | 4 | 80° | 40 nm | INTL |
  | AIM-120 | 2 | 80° | 40 nm | INTL |

  - The gun selects gun acquisition at 5 nm.
  - If an L&S exists, selecting a weapon doesn't change the radar.

---

## 4. Scan parameters

| Parameter | Values |
|---|---|
| Azimuth width | 20 / 40 / 60 / 80 / 140° total, e.g. 80° = ±40° [D DCS-EA, HOG]. The scan center is kept inside the gimbal limits [D HOG]. A 1983 APG-65 set of 20/45/90/140° is attributed to IDA83 [S WT, unconfirmed] |
| Bars | 1 / 2 / 4 / 6 [D]. The 1983 APG-65 went "to 8 bars" [V IDA83]. After the last bar the scan jumps back to bar 1 [D HOG] |
| Bar spacing | 1.2° (current DCS) vs 1.3° (2018 guide); 4.2° on the 5 nm scale in RWS/VS; 2.0° for 2-bar TWS [D HOG, DCS-EA; S VRS]. The altitude-coverage check below fits 1.2° |
| Beamwidth | ~3.3° [V IDA83] |
| Scan rate | ~65°/s for the APG-65 [S WT; not found in the IDA83 OCR]. The DCS TWS limits fit exactly ≤3.0 s at 80°/s (2×80, 4×60 and 6×40 are 160–240° of sweep). ESTIMATE: a parameter defaulting to 80°/s |
| Frame time | ≈ bars × width ÷ rate, plus turnarounds. At 65 / 80°/s: 140°×4B ≈ 8.6 / 7.0 s; 140°×6B ≈ 12.9 / 10.5 s; 80°×2B ≈ 2.5 / 2.0 s; 60°×4B ≈ 3.7 / 3.0 s (ESTIMATE) |
| Elevation coverage | (bars − 1) × spacing + 3.3°: 1B 3.3°, 2B 4.5°, 4B 6.9°, 6B 9.3°; 4B on the 5 nm scale 15.9° (ESTIMATE) |
| Range scales | 5 / 10 / 20 / 40 / 80 / 160 nm [D DCS-EA, HOG] |
| PRF: HI | Longer range, good against high closure (nose-on); poor at low closure or tail aspect; FM ranging [D DCS-EA; V FI65] |
| PRF: MED | All-aspect, fewer blind zones and false targets, shorter range; range-gated with Barker-13 pulse compression [D DCS-EA; V FI65; S EDWP] |
| PRF: INTL | Alternates HI and MED bar by bar, reversing each frame; MED only on the 5 nm scale; HI only in VS [D HOG] |
| Speed gate | NORM / WIDE sets the width of the Doppler notch [D DCS-EA]. NORM ≈ 90 kt of ground speed (closure in VS); WIDE removes the gate [S VRS] |
| Brick aging | 2 / 4 / 8 / 16 / 32 s [D DCS-EA, HOG]. VRS lists 2–16 s [S] |

### Altitude numbers at the cursor

They show the maximum and minimum altitude (MSL, thousands of feet, clamped to ±99) covered by the scan at the cursor's range. They are drawn above and below the cursor [D HOG, DCS-EA].

**Derivation (ESTIMATE):**

h = own altitude + R · sin(θ_ant ± [(N − 1)/2 · spacing + 1.65°])

- R is the cursor's range, N the number of bars, and θ_ant the antenna elevation.
- Earth curvature R² / (2 · (4/3) · R_earth) can optionally be added.

**Check.** A DCS screenshot is reproduced exactly: 4 bars, cursor at 33 nm, own altitude 14,760 ft and antenna elevation 0° give 27 / 3. A second screenshot fits less well, so treat the convention as approximate.

---

## 5. The A/A radar display (DDI attack format)

### Axes [D DCS-EA, HOG]

The display is a B-scope with own ship at bottom center.
- **X axis:** azimuth relative to the nose, linear, −70° to +70°.
- **Y axis:** range, linear, from 0 to the selected range scale.
- **Dugout:** the top 6% holds angle-only-track (AOT) targets, such as jammers with no range.

### Geometry for redrawing

ESTIMATE ±0.02, measured from DCS screenshots [HOG-IMG]. The unit square spans the pushbutton centers: u runs left→right, v runs top→bottom.

**Tactical region:** u 0.17–0.83, v 0.16–0.82, including the dugout at v 0.16–0.20.

**Ticks** [D HOG]
- Azimuth, top and bottom: 0°, ±30°, ±60°.
- Range, both sides: 25%, 50%, 75%.
- Elevation, left edge: 0° at mid-height, every 10° to ±30°.

**Pushbutton centers**
- Left column, PB1 → PB5 (bottom→top): v = 0.82 / 0.68 / 0.53 / 0.39 / 0.24.
- Top row, PB6 → PB10: u = 0.23 / 0.36 / 0.50 / 0.64 / 0.78.
- Right column, PB11 → PB15 (top→bottom): the same v values.
- Bottom row, PB16 → PB20 (right→left): u = 0.76 → 0.24.

### Pushbutton numbering

- Buttons are numbered **clockwise from the bottom button of the left column** [D HOG].
- PB18 (bottom center) is always MENU. It shows a timer when airborne [D DCS-EA].

### Symbols

DCS, unless noted otherwise.

**Scan and cursor**
- **B-sweep:** a full-height vertical line at the antenna azimuth. It is horizon-referenced in search and body-referenced in STT and ACM [D HOG].
- **Elevation caret:** a "<" on the left edge, pitch- and roll-stabilized, travelling ±60° [D HOG, DCS-EA].
- **Cursor:** two short vertical lines, about 0.05 apart and 0.04 tall, with the altitude numbers above and below [D DCS-EA].
- **Raw hits:** small filled rectangles (bricks) that fade with age.

**HAFU symbol** (screenshot [HOG-IMG])
- **Top half:** own-ship identification, which also sets the color in DCS.
  - Hostile: red chevron (^).
  - Friendly: green arc.
  - Unknown: yellow open box.
  - Ambiguous: yellow box with a bold top bar.
- **Bottom half:** datalink identification, drawn inverted.
- **Center:** rank 1–8, ★ for the L&S, ◇ for the DT2, "A" for angle-only.
- **Stem:** a line from the bottom showing the track's direction relative to own ship [D HOG].
- **Labels on the L&S / DT2:** Mach to the left, altitude (thousands of feet) to the right. "J" replaces the Mach number when the target is jamming [D HOG].

**L&S cues** [D HOG]
- Target ground track, in degrees, at the top-left inside the region.
- Altitude difference next to the elevation caret.
- A ">" range caret on the right edge, with closure in knots beside it.
- In STT, an acceleration bar perpendicular to the stem when the target pulls ≥3 g.

**Horizon line and fixed velocity vector** at upper-center, about (0.50, 0.39) [D HOG-IMG, DCS-EA].

**Launch zone and steering** [D DCS-EA; ESTIMATE from screenshots]
- **ASE circle,** centered mid-region, about 17% of the region width in the screenshots; its size may vary.
- **Steering dot.**
- **Launch zone ("I"):** a vertical bar at the L&S azimuth on the range axis, with Rmax at the top, an Rne crossbar and Rmin at the bottom. It is hidden in RAID and EXP [S VRS].
- **"SHOOT" cue:** position undocumented.
- **Breakaway "X".**

**Other legends** [D HOG]: an "AACQ" at top-left while AACQ is armed, "MEM", and "RDR AOT" centered.

**Around the tactical region** [D HOG-IMG]
- Speed and Mach at bottom-left.
- Own altitude at bottom-right.
- Radar gain number in the bottom-left corner.
- Minimum range ("0") in the bottom-right corner.
- Own heading centered above the region.
- Radar status and channel ("OPR" / "C11") at top-left.
- TDC-ownership diamond and range-scale number at top-right.

### Pushbutton map

Sources: [D HOG, HOG-IMG, DCS-EA]. The RWS column was checked by eye against the screenshot.

| PB | RWS | TWS | STT | DATA sub-level |
|---|---|---|---|---|
| 1 | PRF (MED/HI/INTL); PRF in use shown above | same | same | "LDF" (undocumented) |
| 2 | "RDR PRI" legend (undocumented) | same | same | Speed gate NORM/WIDE |
| 3 | SURF (A/G radar, NAV master mode only) | — | — | — |
| 4 | — | — | — | ECCM |
| 5 | Mode RWS/TWS/VS (press to cycle) | TWS | RTS + mode to return to | RWR ATTK |
| 6 | Bars + current bar ("4B 2") | same | shown | — |
| 7 | SIL | SIL | SIL | — |
| 8 | ERASE | HITS | — | — |
| 9 | — | RAID | — | — |
| 10 | Weapon legend (e.g. "9M 2"; crossed out if not armed) | same | TWS (to TWS, AUTO centering) | AGE (s) |
| 11 / 12 | Range ↑ / ↓; range number and TDC diamond above | same | removed (ARSA) | — / RAID 1-LOOK (not implemented) |
| 13 | SET | AUTO / MAN | — | COLOR |
| 14 | RSET | RSET | RSET | MSI |
| 15 | NCTR | NCTR | NCTR | LTWS |
| 16 | DATA | DATA | DATA | DATA (boxed; press to exit) |
| 17 | CHAN (radar channel) | — | CHAN | DCLTR |
| 18 | MENU (timer when airborne) | same | same | same |
| 19 | Azimuth width | Azimuth width (limited) | — | BRA |
| 20 | MODE (2018 guide: cycles RWS/VS/TWS) | EXP | EXP (screenshot) | — |

**RSET** [D HOG]
- Clears the L&S and DT2, except the STT target.
- Re-enables ARSA.
- Clears HITS.
- Removes scan bias.
- Exits EXP and RAID.

**Sub-levels.** DATA and SIL are the only sub-levels; current DCS has no mode-select sub-level. The 2018 guide instead described a mode area reached by moving the TDC across the display edge [D DCS-EA].

---

## 6. HOTAS radar controls

### Throttle

**TDC** [D DCS-EA, HOG]
- Slews the cursor. A diamond at a display's top-right shows which display owns the TDC.
- Press and release (under 1 s) on empty space: sets the scan center.
- Hold over 1 s: Spotlight (2018 guide).

**Antenna elevation wheel**
- Rolling it aft raises the scan. All bars move together.
- No effect in TWS AUTO [D DCS-EA, HOG].

**RAID / FLIR FOV:** SCAN RAID from TWS, STT RAID from STT [D HOG].

**Cage / Uncage** [D HOG, DCS-EA]
- Weapon functions: AIM-9 seeker, AIM-120 mode, AIM-7 loft.
- Toggles WACQ between caged and uncaged.
- 2018 guide: a press under 0.8 s with an L&S commands STT.

### Stick

**Sensor Control ("castle") switch** [D DCS-EA, HOG]
- Left / right / aft: gives the TDC to the left DDI / right DDI / center display.
- Toward the display that already owns the TDC: AACQ.
- Forward: ACM.
- Press (depress): IFF interrogation of the target under the cursor.

**Weapon select** [D DCS-EA; S search]
- Forward: AIM-7. Press: AIM-9. Right: AIM-120. Aft: gun (gun acquisition). Left: none.
- Repeating the same direction steps through the stations [D HOG].

**Trigger:** fires A/A weapons.

### Designation logic [D HOG; S VRS]

**TDC press on a brick**
- LTWS off: STT.
- LTWS on: the HAFU appears, and pressing designates it.

**TDC press on a trackfile**
- No L&S yet: it becomes the L&S.
- An L&S already exists: it becomes the DT2, replacing any old one.

**TDC press on the DT2:** it becomes the L&S.

**TDC press on the L&S:** STT.

### Undesignate [D HOG]

- **No L&S:** the #1-ranked track becomes the L&S.
- **L&S but no DT2:** steps the L&S through the ranks. After a pause of 4 s or more, the next press restarts at rank 1.
- **L&S and DT2:** swaps them.
- **In STT:** returns to search, breaking the lock.
- **In ACM:** exits ACM.
- Also exits SCAN RAID and Spotlight.

### Breaking lock

Any of these breaks the lock: Undesignate, RTS (PB5), TWS (PB10), or entering ACM [D HOG].

### Cursor bump [D HOG]

Move the cursor out of the tactical region and back in within 0.8 s. The values wrap around at the ends.

| Edge | Effect |
|---|---|
| Top | Range up |
| Bottom | Range down |
| Left | Azimuth narrower |
| Right | Azimuth wider |

---

## 7. IFF and identification

**How to interrogate** [D HOG]
- Press the Sensor Control Switch with the cursor on a HAFU.
- In STT, the L&S is interrogated automatically.
- The interrogator does one 22° scan centered on the track.

**Classification** [D HOG]

| Class | Condition |
|---|---|
| Friendly | Positive IFF reply, or a datalink position report (PPLI) |
| Ambiguous | Own ID and a datalink donor's ID conflict [D CHK p636]. (Our earlier Hoggit reading, "negative IFF reply", was wrong: a negative reply alone leaves the track unknown [D CHK p639].) |
| Hostile | Negative IFF reply, plus a hostile NCTR print or a hostile datalink ID |
| Unknown | Default, including after a negative IFF reply with no other evidence [D CHK] |

- **NCTR** works only in STT, via PB15 [D HOG].
- **The HAFU is advisory.** Identification stays the pilot's responsibility [D HOG].

**Real hardware** [V BAE, 2025 datasheet]

The F/A-18 uses the AN/APX-111(V) combined interrogator/transponder.

| Spec | Value |
|---|---|
| Interrogation range | >100 nm |
| Azimuth coverage | ±60° |
| Elevation coverage | +60 / −30° |
| Bearing accuracy | ±2° |
| Modes | 1, 2, 3/A, C, 5 |

Mode 5 is today's standard; jets of the APG-73's era used Mode 4.

---

## 8. DDI hardware

**DCS DDIs**
- "3-color" displays (green / yellow / red); the COLOR option switches them to monochrome [D DCS-EA, HOG].
- 20 pushbuttons.
- A brightness selector (OFF / NIGHT / DAY) at the top, a BRT knob at bottom-left and a CONT knob at bottom-right [D DCS-EA, HOG-IMG].

**Real-world display era**
- Night Attack C/Ds (1989) added an independent color display and a color moving map [V GSCD].
- The USMC C+ upgrade adds "full-color" displays, which implies the legacy DDIs weren't full color [TWZ].
- Monochrome green is the likely era baseline, but this is unconfirmed.
- No authoritative screen size was found.

**Center color display (AMPCD)** [D DCS-EA]
- Full color and night-vision compatible.
- Driven by the digital map set (for the HSI) or by the left DDI.
- Shows any MENU format except the A/G radar.
- Controls:
  - rotary OFF / brightness control;
  - rockers for NIGHT / DAY, symbology, gain and contrast;
  - HDG and CRS switches.

---

## 9. Teaching notes

1. **The B-scope is not a map.** Azimuth is spread linearly across the width, so everything at close range is stretched along the bottom edge [D HOG]. A target on a collision course keeps a constant bearing and slides straight down; one passing abeam curves outward. Show a top-down view beside it.
2. **Altitude coverage grows with range.** The scan is a wedge: with 4 bars it is about 7° tall, roughly 29,000 ft at 40 nm but about 7,000 ft at 10 nm (ESTIMATE). A low target at long range can sit under the beam. Read the cursor's altitude numbers and roll the elevation wheel.
3. **Bigger scan, older picture.** A 140° / 6-bar scan can take more than 10 s per frame; TWS caps frames at 3 s [D HOG]. Between looks, tracks are extrapolated, and they "jump" when a maneuvering target is seen again.
4. **Bricks are history; trackfiles are estimates.** A brick shows where the target *was*. Long aging leaves ghost trails; ERASE clears them [D DCS-EA].
5. **The Doppler notch.** A pulse-Doppler radar rejects echoes whose speed toward you matches the ground's. A target beaming you (flying perpendicular) falls into that clutter notch. WIDE opens the speed gate [D DCS-EA; S VRS].
6. **PRF is a trade-off.** HI gives range against nose-on targets. MED sees every aspect, including a tail chase, at shorter range. INTL mixes the two [D DCS-EA; V FI65].
7. **RWS finds, TWS keeps.** Use RWS/LTWS for surveillance. Use TWS over a small volume for fresh trackfiles, ranking and multiple AMRAAM targets [D HOG; V FI73].
8. **The designation ladder.** Trackfile → L&S (★) → STT, with the DT2 (◇) as the spare. Undesignate steps, swaps or breaks lock [D HOG].
9. **STT is loud.** Dedicated illumination shows on the target's warning receiver as a "tracking" emitter, and the DCS RWR marks tracking emitters [D HOG]. TWS looks like ordinary search (general principle).
10. **Range scale ≠ detection range.** ED estimates about 65 nm in HPRF and about 30 nm in MPRF against a 5 m² target, scaling with RCS^¼ [S EDWP]. Aspect and PRF shift it further.

---

## 10. Sources

| Tag | URL | Trust |
|---|---|---|
| NFM500 | https://www.docdroid.net/file/download/uQCJuVs/f-18abcd-hornet-pocket-checklist-pdf.pdf | Official USN NATOPS pocket checklist (public copy); high |
| NFM000 | https://info.publicintelligence.net/F18-ABCD-000.pdf ; https://www.yumpu.com/en/document/view/52343119/natops-flight-manual-navy-model-f-a-18a-b-c-d-161353-and-up-aircraft | Official NATOPS; high but not machine-readable here (table of contents checked only) |
| DOTE97 | https://www.globalsecurity.org/military/library/budget/fy1997/dot-e/navy/97fa18cd.html | DOT&E FY97 report (mirror); high |
| IDA83 | https://archive.org/stream/DTIC_ADA142103/DTIC_ADA142103_djvu.txt | DTIC/IDA APG-65 case study, 1983; high (OCR) |
| FI73 / FI65 | https://www.forecastinternational.com/archive/disp_pdf.cfm?DACH_RECNO=730 ; https://www.forecastinternational.com/archive/disp_pdf.cfm?DACH_RECNO=726 | Industry analyst; medium-high (tables garbled) |
| RTN06 / RTX | https://raytheon.mediaroom.com/index.php?s=43&item=471 ; https://www.rtx.com/raytheon/what-we-do/air/ris-radars-history | Manufacturer; high for dates and counts |
| BAE | https://www.baesystems.com/en-us/dam/jcr:44b079f8-55e6-4f0f-8bac-49e3f8943088/20-A90-05-AN-APX-111V-CIT-FA-18-datasheet-2025-web.pdf | Manufacturer; high (modern configuration) |
| GS65 / GSCD | https://www.globalsecurity.org/military/systems/aircraft/systems/an-apg-65.htm ; https://www.globalsecurity.org/military/systems/aircraft/f-18cd.htm | Secondary compilation; medium |
| EDWP | https://www.digitalcombatsimulator.com/upload/medialibrary/751/420tvzzkl8vyxzukcdzamjf7gcrhwzmo/Eagle_Dynamics_Radar_White_Paper_v1.pdf | ED engineering estimates; medium |
| DCS-EA | https://uploads.mudspike.com/original/3X/0/e/0ea669f67578fba4508b05adb73fd1fedbba0ece.pdf (current: https://www.digitalcombatsimulator.com/en/downloads/documentation/dcs-hornet_early_access_guide_en/) | Official DCS, 2018 edition; high for DCS, partly outdated |
| HOG / HOG-IMG | https://wiki.hoggitworld.com/view/F/A-18C (e.g. https://wiki.hoggitworld.com/images/8/80/RDR_ATTK_Common_Labels_1.png , https://wiki.hoggitworld.com/images/d/de/HAFU_Labels_3.png) | Community wiki of current DCS; medium-high for DCS |
| CHK | https://chucksguides.com/aircraft/dcs/fa-18c/ (PDF https://assets.chucksguides.com/pdf/DCS%20FA-18C%20Hornet%20Guide.pdf, Dec 2025; Part 9 §2.1 pp. 183–229, Part 12 pp. 627–645) | Community guide with current DCS screenshots; high for DCS behaviour. Page numbers are PDF pages |
| VRS | https://forums.vrsimulations.com/support/index.php/A/A_Radar | Super Hornet sim wiki; secondary |
| WP | https://en.wikipedia.org/wiki/AN/APG-65_radar_family | Secondary; pointers only |
| WT | https://forum.warthunder.com/t/hughes-an-apg-65-radar-series-technical-data-and-discussion/1694 | Forum; low (the 65°/s figure is unconfirmed) |
| TWZ | https://www.twz.com/36435/the-plan-for-making-aging-marine-corps-hornets-deadlier-than-ever-for-a-final-decade-of-service | Defense journalism; medium |
| RAeS | https://www.aerosociety.com/news/dcs-fa-18c-hornet-a-first-look/ | Review; medium (source of "Lot 20") |
| HOTASDOC | https://forum.dcs.world/applications/core/interface/file/attachment.php?id=138434 | User-made document, seen only as a search excerpt; low |
| — | https://simtuts.com/guides/fa18-attack-radar-air-to-air | Contains errors; deliberately not used |
