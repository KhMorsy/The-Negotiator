import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

describe("ConfirmJobSpecScreen client confirm", () => {
  it("calls confirm API, starts calls, and updates button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobSpec: { ...mockJobSpec, confirmed: true } }))));
    render(<ConfirmJobSpecScreen jobSpec={mockJobSpec} />);
    fireEvent.click(screen.getByTestId("confirm-job-spec-button"));
    await waitFor(() => expect(screen.getByTestId("confirm-job-spec-button")).toHaveTextContent("Confirmed"));
    await waitFor(() => expect(screen.getByTestId("view-calls-link")).toBeInTheDocument());
  });
});
