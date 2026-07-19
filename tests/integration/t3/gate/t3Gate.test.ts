import { beforeEach, describe, expect, it } from "vitest";
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";
import { handleEmailFallback } from "@/app/calls/emailFallbackHandler";
import { generateSkillFromAsk } from "@/app/skills/skillGenerator";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import type { JobSpec, LLMPlanner } from "@/contracts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("T3 integration gate — CI fake adapters", () => {
  beforeEach(() => {
    resetContainerForTests();
    delete process.env.FEATURE_ASSISTED_CALL_COPILOT;
  });

  it("G1: SkillGenerator produces valid Skill for unseen ask", async () => {
    const skillRepo = createFileSkillRepository(
      mkdtempSync(join(tmpdir(), "negotiator-skills-")),
    );
    const planner: LLMPlanner = {
      async chooseSkill() {
        return {
          skillId: "ask_pet_fee_waiver",
          suggestedPhrasing: JSON.stringify({
            id: "ask_pet_surcharge_waiver",
            name: "Pet surcharge waiver",
            category: "commitment_leverage",
            selectionSignals: ["pet fee", "pet surcharge"],
            preconditions: { requiresRecurringJob: true },
            moveTemplate: "Can you waive the pet surcharge for recurring service?",
          }),
        };
      },
    };

    const jobSpec: JobSpec = buildJobSpec(
      { sqft: 2000, bedrooms: 3, bathrooms: 2, pets: true },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" },
    );

    const skill = await generateSkillFromAsk(
      { planner, skillRepo },
      {
        customerAsk: "Can you ask them to waive the pet surcharge?",
        jobSpec,
      },
    );

    expect(skill.id).toMatch(/^[a-z0-9_]+$/);
    expect(skill.moveTemplate.length).toBeGreaterThanOrEqual(10);
    expect(skill.selectionSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("G2: Room photo path fills partial JobSpec draft", async () => {
    const container = createContainer();
    const { jobSpecId } = await container.intakeOrchestrator.startIntake(
      "Austin, TX",
    );
    const before = await container.repos.jobSpecs.getById(jobSpecId);
    expect(before?.sqft).toBeFalsy();

    const updated = await container.intakeOrchestrator.mergeRoomPhotos(
      jobSpecId,
      [{ bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }],
    );

    expect(updated.sqft).toBe(1850);
    expect(updated.conditionNotes).toBeTruthy();
  });

  it("G3: Email fallback records callback_commitment without throwing", async () => {
    const container = createContainer();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2, pets: false },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" },
    );
    const job = await container.repos.jobSpecs.create(draft);
    const call = await container.repos.calls.create({
      jobSpecId: job.id,
      vendorId: "vendor-tough",
      round: 1,
    });

    const result = await handleEmailFallback(
      {
        emailNotifier: container.emailNotifier,
        callRepo: container.repos.calls,
      },
      {
        callId: call.id,
        jobSpec: job,
        vendorEmail: "quotes@vendor.com",
        vendorName: "Sparkle Pro",
        lastVendorUtterance: "We don't quote over the phone.",
      },
    );

    expect(result.outcome).toBe("callback_commitment");
    const row = await container.repos.calls.getById(call.id);
    expect(row?.outcome).toBe("callback_commitment");
  });

  it("G4: Co-pilot disabled by default; enabled when flag set", async () => {
    const { createCopilotSession } = await import(
      "@/app/copilot/assistedCallCopilot"
    );
    const off = await createCopilotSession({
      jobSpecId: "j1",
      customerPhone: "+1",
    });
    expect(off.enabled).toBe(false);

    process.env.FEATURE_ASSISTED_CALL_COPILOT = "true";
    const on = await createCopilotSession({
      jobSpecId: "j1",
      customerPhone: "+1",
    });
    expect(on.enabled).toBe(true);
  });
});
