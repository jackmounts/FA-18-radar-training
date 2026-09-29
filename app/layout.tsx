import type { Metadata } from 'next';
import { B612_Mono } from 'next/font/google';
import './globals.css';

const ddiFont = B612_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-ddi' });

export const metadata: Metadata = {
  title: 'Hornet Radar Trainer — learn the AN/APG-73',
  description:
    'Interactive F/A-18C Hornet AN/APG-73 radar simulator with lessons and random encounters. Unofficial training aid.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={ddiFont.variable}>
      <body className="bg-panel font-mono text-ink antialiased">{children}</body>
    </html>
  );
}
