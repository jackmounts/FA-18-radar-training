import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 font-sans">
      <p className="font-mono text-xs tracking-[0.35em] text-phosphor">404 · NO CONTACT</p>
      <h1 className="mt-2 text-2xl font-bold">Nothing on the scope at this address</h1>
      <p className="mt-3 text-ink/85">The page you asked for doesn&apos;t exist. The trainer is on the home page.</p>
      <Link href="/" className="mt-6 self-start rounded-md border border-phosphor/40 px-4 py-2 text-sm text-phosphor hover:bg-phosphor/10">
        Back to the cockpit
      </Link>
    </main>
  );
}
