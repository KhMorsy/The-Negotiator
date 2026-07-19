import { describe, expect, it, vi } from "vitest";
import { storeGoldenRecording } from "@/adapters/telephony/storeGoldenRecording";

describe("storeGoldenRecording", () => {
  it("uploads an MP3 and updates the call row", async () => {
    const upload = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example/recordings/call-1.mp3",
    });
    const updateRecordingUrl = vi.fn().mockResolvedValue(undefined);
    const bytes = new Uint8Array([0xff, 0xfb]);

    const result = await storeGoldenRecording(
      { storage: { upload }, callRepo: { updateRecordingUrl } },
      { callId: "call-1", bytes },
    );

    expect(upload).toHaveBeenCalledWith("recordings/call-1.mp3", bytes, "audio/mpeg");
    expect(updateRecordingUrl).toHaveBeenCalledWith(
      "call-1",
      "https://storage.example/recordings/call-1.mp3",
    );
    expect(result.recordingUrl).toContain("call-1.mp3");
  });
});
