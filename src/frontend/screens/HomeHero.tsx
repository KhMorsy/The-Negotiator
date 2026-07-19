import Link from "next/link";

export function HomeHero() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">The Negotiator</h1>
      <p className="max-w-2xl text-lg text-gray-600">
        Built for the busy dual-income family who wants reliable home cleaning
        without spending evenings on hold or overpaying for hidden fees.
      </p>
      <Link
        href="/intake/job-demo-001"
        className="inline-flex rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
      >
        Start your cleaning quote
      </Link>
    </section>
  );
}
