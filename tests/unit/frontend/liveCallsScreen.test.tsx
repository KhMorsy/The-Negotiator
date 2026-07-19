import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveCallsScreen } from "@/frontend/screens/LiveCallsScreen";

vi.mock("@/frontend/hooks/useCallStatusFeed", () => ({
  useCallStatusFeed: () => ({
    calls: [
      {
        id: "c1",
        jobSpecId: "job-1",
        vendorId: "vendor-tough",
        round: 1,
        outcome: "itemized_quote",
        recordingUrl: null,
      },
    ],
    transport: "polling",
    loading: false,
  }),
}));

describe("LiveCallsScreen", () => {
  it("renders calls with round and outcome badges", () => {
    render(<LiveCallsScreen jobId="job-1" />);

    expect(screen.getByTestId("live-call-row")).toBeInTheDocument();
    expect(screen.getByTestId("call-status-row")).toBeInTheDocument();
    expect(screen.getByText(/itemized quote/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-transport-mode")).toHaveTextContent("polling");
  });
});
