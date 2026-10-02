# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mainly **new DCS F/A-18C Hornet pilots** who are stuck on the radar. They can't move the cursor, can't get a lock, or see contacts on AWACS that their scope doesn't show. They come here to learn the AN/APG-73 from zero, practise it without the rest of the jet getting in the way, and then fly it in DCS. Enthusiasts from other sims, or with no sim, are a secondary audience and need the same no-prior-knowledge explanations.

They use it on a desktop with a keyboard and mouse, sometimes with a joystick, often in a session right before or after flying.

## Product Purpose

A playable sandbox and guided lessons for the Hornet's air-to-air radar. It covers powering the radar up, reading the B-scope, shaping the scan, the modes (RWS, TWS, STT and ACM), designation and locking, IFF/NCTR identification and the Doppler notch. Success means:

- **Lock without help:** after the lessons, a newcomer can find, lock and identify a contact in free play unaided.
- **Transfer to the jet in sim:** what they learn here carries straight over to the DCS Hornet (or another sim's): the same display logic, the same castle-switch and TDC behaviour, the same failure modes.

## Positioning

The radar on its own, with nothing else in the way: no flight model, no weapons, no mission editor. The truth map (instructor view) shows where everyone really is next to what the radar shows. Lessons advance only when you actually do the action. A "From DCS" section answers the questions new Hornet pilots ask most. Its behaviour follows the publicly documented APG-73 (largely via DCS), so habits carry over, but it is built and explained independently of any sim.

## Operating Context

- Free and in the browser, with no install and no account. It's a single page: the cockpit (throttle grip, DDI with 20 pushbuttons, stick grip, flight strip, optional HUD window and instructor map) sits at the top, with reading sections below it (Start here, How it works, Controls, From DCS, Glossary, Sources).
- Input is by action, rebindable to one key and one joystick input each, so users can match their own HOTAS.
- There's a first-visit tutorial, eight lessons, and free play with random encounters, AWACS tasking, a clock and a score.

## Capabilities and Constraints

- Static Next.js export, no backend. Progress and bindings live in `localStorage`. English only.
- Desktop-first. On narrow screens the panels stack under the DDI and every control stays tappable.
- Simplified public-source numbers, not a faithful simulation of classified performance. Values marked `ESTIMATE` are not public.
- Fidelity choice: monochrome green display, as on the legacy C/D DDIs. HAFU identity is shown by shape, not colour.
- Out of scope: air-to-ground, weapons and launch zones, reactive bandits and the RWR, datalink, the VS/RAID/EXP/Spotlight modes, sound, accounts and leaderboards. The FAQ names AIM-120 and its launch zone as planned next.

## Brand Commitments

- Name: **Hornet Radar Trainer**.
- Unofficial. Not affiliated with the US Navy, Boeing, RTX or Eagle Dynamics, and must say so.
- All copy and drawings are original. No screenshots from manuals or DCS. Sources are cited.
- MIT licensed.
- Copy stays sim-agnostic even though DCS pilots are the main audience. The "From DCS" section is a bridge, not a sign that the site is tied to DCS. Disclaimers may say behaviour can differ from DCS, but they shouldn't contradict the DCS-facing help.

## Evidence on Hand

- Research and citations: `docs/research/apg-73.md` and the Sources list in `components/sections/About.tsx`.
- User guide: `docs/USER_GUIDE.md`. Design spec: `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md`.
- There are no testimonials, user counts, endorsements or press. Don't fabricate any.

## Product Principles

1. **Doing beats reading.** Every idea leads to something to try in the cockpit, and lessons advance on the action, not on a NEXT button.
2. **It has to transfer.** Behaviour matches the documented jet closely enough that a pilot's habits carry into DCS. Simplifications are disclosed, never hidden.
3. **Start from zero.** Assume no radar knowledge. Every term is explained or linked to the glossary.
4. **Honest about its limits.** It states what it leaves out and which numbers are estimates.
