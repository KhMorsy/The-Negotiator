import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

describe("JourneyStepper", () => {
  it("marks earlier steps done, current active, later upcoming", () => {
    render(<JourneyStepper current="calls" />);
    const steps = screen.getAllByTestId("journey-step");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveAttribute("data-state", "done");
    expect(steps[1]).toHaveAttribute("data-state", "done");
    expect(steps[2]).toHaveAttribute("data-state", "active");
    expect(steps[3]).toHaveAttribute("data-state", "upcoming");
    expect(screen.getByText("Hagal calls")).toBeInTheDocument();
  });
});
