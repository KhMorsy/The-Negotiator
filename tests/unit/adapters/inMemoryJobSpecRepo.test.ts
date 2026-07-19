import { describe, expect, it } from "vitest";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";

describe("createInMemoryJobSpecRepository", () => {
  it("creates and retrieves draft JobSpec", async () => {
    const repo = createInMemoryJobSpecRepository();
    const created = await repo.create({
      jobType: "recurring_weekly",
      sqft: 1800,
      bedrooms: 3,
      bathrooms: 2,
      frequency: "weekly",
      addOns: [],
      suppliesProvided: false,
      pets: false,
      accessNotes: "",
      conditionNotes: "",
      geo: "Austin, TX",
    });
    const fetched = await repo.getById(created.id);
    expect(fetched?.sqft).toBe(1800);
    expect(fetched?.confirmed).toBe(false);
  });
});
