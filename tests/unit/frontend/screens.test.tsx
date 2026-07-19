import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CallsStatusScreen } from "@/frontend/screens/CallsStatusScreen";
import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { IntakeScreen } from "@/frontend/screens/IntakeScreen";
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import {
  mockJobSpec,
  mockReportPrimary,
  mockVendors,
} from "@/frontend/mocks/fixtures";

describe("frontend screens", () => {
  it("IntakeScreen shows voice widget placeholder", () => {
    render(<IntakeScreen jobSpec={mockJobSpec} />);
    expect(screen.getByTestId("intake-voice-widget")).toBeInTheDocument();
    expect(screen.getByTestId("intake-upload-quote")).toBeInTheDocument();
  });

  it("ConfirmJobSpecScreen lists sqft and confirm CTA", () => {
    render(<ConfirmJobSpecScreen jobSpec={mockJobSpec} />);
    expect(screen.getByText(/1800/)).toBeInTheDocument();
    expect(screen.getByTestId("confirm-job-spec-button")).toBeInTheDocument();
  });

  it("CallsStatusScreen lists vendor call rows", () => {
    render(<CallsStatusScreen jobId={mockJobSpec.id} vendors={mockVendors} />);
    expect(screen.getAllByTestId("call-status-row")).toHaveLength(3);
  });

  it("ReportScreen shows recommendation", () => {
    render(<ReportScreen report={mockReportPrimary} />);
    expect(screen.getByTestId("report-recommendation")).toHaveTextContent(
      mockReportPrimary.plainLanguageWhy,
    );
    expect(screen.getAllByTestId("report-quote-row")).toHaveLength(3);
  });
});
