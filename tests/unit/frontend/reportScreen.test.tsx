import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockReportPrimary } from "@/frontend/mocks/fixtures";

describe("ReportScreen drilldowns", () => {
  it("shows recommendation and enabled D/E/F expanders", () => {
    render(
      <ReportScreen
        report={mockReportPrimary}
        drilldowns={{
          savings: { initialTotal: 225, negotiatedTotal: 195, marketBenchmark: 220 },
          redFlags: [],
          trust: [],
        }}
      />,
    );
    expect(screen.getByTestId("report-recommendation")).toBeInTheDocument();
    for (const id of ["drilldown-savings", "drilldown-red-flags", "drilldown-trust"]) {
      expect(screen.getByTestId(id)).not.toHaveAttribute("aria-disabled");
    }
    expect(screen.getByText(/\$30 saved/i)).toBeInTheDocument();
  });
});
