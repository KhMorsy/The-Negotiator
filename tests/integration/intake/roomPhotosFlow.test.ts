import { beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";

describe("room photo intake flow", () => {
  beforeEach(() => resetContainerForTests());

  it("merges vision patch into draft JobSpec", async () => {
    const container = createContainer();
    const { jobSpecId } = await container.intakeOrchestrator.startIntake("Austin, TX");

    const updated = await container.intakeOrchestrator.mergeRoomPhotos(jobSpecId, [
      { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
    ]);

    expect(updated.sqft).toBe(1850);
    expect(updated.conditionNotes).toMatch(/living room/i);
    expect(updated.confirmed).toBe(false);
  });
});
