const STEPS = [
  { key: "intake", label: "Tell Hagal", desc: "A 2-minute chat about your home." },
  { key: "confirm", label: "Confirm the job", desc: "Approve with one tap." },
  { key: "calls", label: "Hagal calls", desc: "Watch him negotiate live." },
  { key: "report", label: "Pick your winner", desc: "Ranked quotes, plain advice." },
] as const;

export type JourneyStep = (typeof STEPS)[number]["key"];

export function JourneyStepper({ current }: { current: JourneyStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <ol data-testid="journey-stepper" className="flex gap-3">
      {STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
        return (
          <li
            key={step.key}
            data-testid="journey-step"
            data-state={state}
            className={
              state === "active"
                ? "flex-1 rounded-2xl border-2 border-terracotta bg-apricot-soft p-3"
                : state === "done"
                  ? "flex-1 rounded-2xl border border-sage bg-sage/40 p-3"
                  : "flex-1 rounded-2xl border border-dashed border-linen bg-white p-3"
            }
          >
            <span
              className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                state === "active" ? "bg-terracotta" : "bg-pine"
              }`}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <p className="text-sm font-extrabold">{step.label}</p>
            <p className="hidden text-xs text-muted-warm sm:block">{step.desc}</p>
          </li>
        );
      })}
    </ol>
  );
}
