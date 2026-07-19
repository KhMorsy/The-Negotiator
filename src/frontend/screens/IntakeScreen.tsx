import type { JobSpec } from "@/contracts";

export function IntakeScreen({ jobSpec }: { jobSpec: JobSpec }) {
  return (
    <section className="space-y-6" data-testid="intake-screen">
      <h1 className="text-2xl font-semibold">Tell us about your home</h1>
      <p className="text-gray-600">Job draft: {jobSpec.id}</p>
      <div
        data-testid="intake-voice-widget"
        className="rounded-lg border border-dashed border-gray-300 p-8 text-center"
      >
        Voice interview widget (ElevenLabs — wired in PR-B2)
      </div>
      <div data-testid="intake-upload-quote">
        <label className="block text-sm font-medium">
          Upload existing quote (PDF/image)
        </label>
        <input type="file" accept=".pdf,image/*" className="mt-2" disabled />
      </div>
    </section>
  );
}
