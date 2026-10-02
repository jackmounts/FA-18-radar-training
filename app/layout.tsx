import type { Metadata, Viewport } from 'next';
import { B612, B612_Mono } from 'next/font/google';
import './globals.css';

const ddiFont = B612_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-ddi' });
// B612 Mono's proportional sibling, for the long reading sections below the cockpit
const proseFont = B612({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-prose' });

const title = 'Hornet Radar Trainer — learn the F/A-18C AN/APG-73 radar';
const description =
  'Interactive F/A-18C Hornet AN/APG-73 radar simulator in the browser: guided lessons on RWS, TWS, STT and ACM modes, then random intercepts. Free, unofficial training aid for DCS pilots.';

export const metadata: Metadata = {
  title,
  description,
  // Link previews need an absolute og:image URL: the Dockerfile passes the public origin in as SITE_URL at build time
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  alternates: process.env.SITE_URL ? { canonical: '/' } : undefined,
  openGraph: { title, description, type: 'website', siteName: 'Hornet Radar Trainer' },
  twitter: { card: 'summary_large_image' },
};

// Mobile browser chrome matches the panel instead of a white bar
export const viewport: Viewport = { themeColor: '#1f2220' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${ddiFont.variable} ${proseFont.variable}`}>
      <body className="bg-panel font-mono text-ink antialiased">{children}</body>
    </html>
  );
}
