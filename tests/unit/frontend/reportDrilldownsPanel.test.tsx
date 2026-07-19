import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportDrilldownsPanel } from "@/frontend/components/ReportDrilldownsPanel";
import type { ReportDrilldowns } from "@/contracts";

const drilldowns: ReportDrilldowns = {
  savings: { initialTotal: 225, negotiatedTotal: 195, marketBenchmark: 220 },
  redFlags: [{ quoteId: "q-low", reasons: ["more than 30% below market benchmark"] }],
  trust: [{ vendorId: "vendor-a", score: 82 }],
};

describe("ReportDrilldownsPanel", () => {
  it("renders enabled D/E/F expanders with data", () => {
    render(<ReportDrilldownsPanel drilldowns={drilldowns} />);

    expect(screen.getByTestId("drilldown-savings")).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.getByText(/\$30 saved/i)).toBeInTheDocument();
    expect(screen.getByTestId("drilldown-red-flags")).toBeInTheDocument();
    expect(screen.getByText(/below market/i)).toBeInTheDocument();
    expect(screen.getByTestId("drilldown-trust")).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });
});
