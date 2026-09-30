import { SectionHeading } from './SectionHeading';

// The questions new DCS Hornet pilots ask most on the ED forums and r/hoggit, answered in the trainer's terms.
const FAQ: [string, string][] = [
  [
    "My cursor won't move.",
    'The TDC only works on the display that owns it, marked by a diamond in the top-right corner. Push the castle switch toward the radar display (right in DCS, where the radar sits on the right DDI; L here) to take it.',
  ],
  [
    "I press the TDC on a brick and it doesn't lock.",
    'That is Latent TWS, on by default in DCS: the cursor on a brick shows its trackfile, the first press makes it the L&S (★) and the second locks it. Castle toward the radar (Fast Acquisition) locks in one press. Turn LTWS off on the DATA page (PB15) if you want one press to lock a brick.',
  ],
  [
    'AWACS or the SA page shows a contact, but my radar shows nothing.',
    "Almost always the antenna elevation. Put the cursor at the contact's range, read the two altitude numbers beside it and roll the antenna until the contact's altitude sits between them. Then check the range scale and the azimuth width. The lesson \"From an AWACS call to a lock\" drills this.",
  ],
  [
    'The radar shows nothing at all.',
    'Check the RADAR knob is in OPR (STBY shows a cross in the lower-left corner) and SIL is not boxed. Then elevation, as above. A target flying across your nose can hide in the Doppler notch; one flying away is hard to see in HI PRF.',
  ],
  [
    'My lock keeps breaking.',
    'The antenna can only look 70° either side of the nose, so hard turns lose it. A beaming target drops into the notch: MEM shows for about 3 s, then the lock breaks. It also breaks out of range.',
  ],
  [
    'Should I lock (STT) or use TWS?',
    "STT gives the best data on one target, but its warning receiver hears the lock and the rest of your picture freezes. TWS tracks several contacts without telling them. See \"Which mode, and when\" above.",
  ],
  [
    'Undesignate does something different each time.',
    'It depends on the state. In STT or ACM it returns to search. In RWS or TWS with nothing designated it makes the #1 trackfile the ★. With a ★ and a ◇ it swaps them; with only a ★ it steps the ★ through the ranks.',
  ],
  [
    'What does the trainer leave out?',
    'Weapons (the AIM-120 and its launch zone are planned next), datalink and the SA and Az/El pages, the VS, RAID and Spotlight modes, and bandits that react to your lock. The radar numbers are simplified public estimates.',
  ],
];

export function FromDcs() {
  return (
    <section id="from-dcs" aria-labelledby="from-dcs-h" className="mx-auto max-w-5xl px-4 py-16 font-sans">
      <SectionHeading id="from-dcs-h" label="COMING FROM DCS">
        What new DCS Hornet pilots ask first
      </SectionHeading>
      <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-ink/85">
        The trainer follows the DCS Hornet&apos;s radar controls where it can. These are the questions new DCS Hornet pilots ask most.
      </p>
      <div className="mt-6 divide-y divide-white/5 border-y border-white/5">
        {FAQ.map(([q, a]) => (
          <details key={q} className="py-3">
            <summary className="cursor-pointer text-base font-bold text-phosphor">{q}</summary>
            <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-ink/85">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
