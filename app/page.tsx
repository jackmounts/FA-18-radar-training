import { Cockpit } from '@/components/cockpit/Cockpit';
import { StartHere } from '@/components/sections/StartHere';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ControlsReference } from '@/components/sections/ControlsReference';
import { Glossary } from '@/components/sections/Glossary';
import { FromDcs } from '@/components/sections/FromDcs';
import { About } from '@/components/sections/About';
import { SectionNav } from '@/components/sections/SectionNav';

export default function Home() {
  return (
    <>
      {/* The cockpit is dozens of tab stops; keyboard users can jump straight to the lessons */}
      <a
        href="#start"
        className="sr-only z-50 rounded-md bg-bezel px-4 py-2 text-sm text-phosphor focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to the lessons
      </a>
      <main className="pb-32">
        <h1 className="sr-only">Hornet Radar Trainer — learn the AN/APG-73 radar</h1>
        <Cockpit />
        <SectionNav />
        <StartHere />
        <HowItWorks />
        <ControlsReference />
        <FromDcs />
        <Glossary />
      </main>
      <About />
    </>
  );
}
