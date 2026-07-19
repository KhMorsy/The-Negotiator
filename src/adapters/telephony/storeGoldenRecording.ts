export async function storeGoldenRecording(
  deps: {
    storage: {
      upload(
        path: string,
        bytes: Uint8Array,
        contentType: string,
      ): Promise<{ publicUrl: string }>;
    };
    callRepo: {
      updateRecordingUrl(callId: string, recordingUrl: string): Promise<unknown>;
    };
  },
  input: { callId: string; bytes: Uint8Array },
): Promise<{ recordingUrl: string }> {
  const path = `recordings/${input.callId}.mp3`;
  const { publicUrl } = await deps.storage.upload(path, input.bytes, "audio/mpeg");
  await deps.callRepo.updateRecordingUrl(input.callId, publicUrl);
  return { recordingUrl: publicUrl };
}
