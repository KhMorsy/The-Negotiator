import Link from "next/link";

export function NavBar() {
  return (
    <header role="banner" className="border-b border-gray-200 px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          The Negotiator
        </Link>
        <nav aria-label="Main" className="flex gap-4 text-sm">
          <Link href="/intake/job-demo-001">Intake</Link>
          <Link href="/report/job-demo-001">Report</Link>
        </nav>
      </div>
    </header>
  );
}
