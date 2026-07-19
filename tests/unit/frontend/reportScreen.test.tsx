import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockReportPrimary } from "@/frontend/mocks/fixtures";

describe("ReportScreen drilldown stubs", () => {
  it("shows recommendation and disabled D/E/F expanders", () => {
    render(<ReportScreen report={mockReportPrimary} />);
    expect(screen.getByTestId("report-recommendation")).toBeInTheDocument();
    for (const id of ["drilldown-savings", "drilldown-red-flags", "drilldown-trust"]) expect(screen.getByTestId(id)).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(/Available after live calls \(T2\)/i)).toHaveLength(3);
  });
});
