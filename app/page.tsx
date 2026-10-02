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
      <main>
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
