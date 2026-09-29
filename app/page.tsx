import { Cockpit } from '@/components/cockpit/Cockpit';
import { StartHere } from '@/components/sections/StartHere';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ControlsReference } from '@/components/sections/ControlsReference';
import { Glossary } from '@/components/sections/Glossary';
import { About } from '@/components/sections/About';

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Hornet Radar Trainer — learn the AN/APG-73 radar</h1>
      <Cockpit />
      <StartHere />
      <HowItWorks />
      <ControlsReference />
      <Glossary />
      <About />
    </main>
  );
}
