import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCallStatusFeed } from "@/frontend/hooks/useCallStatusFeed";

describe("useCallStatusFeed", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_FAKE_REALTIME", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          calls: [
            {
              id: "c1",
              jobSpecId: "job-1",
              vendorId: "vendor-tough",
              round: 1,
              outcome: null,
              recordingUrl: null,
            },
          ],
        }),
      }),
    );
  });

  it("uses polling when fake realtime is enabled", async () => {
    const { result } = renderHook(() => useCallStatusFeed("job-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transport).toBe("polling");
    expect(result.current.calls).toHaveLength(1);
  });
});
