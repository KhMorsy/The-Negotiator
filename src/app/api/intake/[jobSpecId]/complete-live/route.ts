import { NextResponse } from "next/server";
import type { JobSpec } from "@/contracts";
import { createContainer } from "@/app/composition/createContainer";

type LiveInterviewPayload = Record<string, unknown>;

function frequencyValue(value: unknown): JobSpec["frequency"] | undefined {
  return value === "once" || value === "weekly" || value === "biweekly" || value === "monthly"
    ? value
    : undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number) || number < 0) {
    return undefined;
  }
  return number;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function interviewDetails(payload: LiveInterviewPayload) {
  const details: Partial<
    Pick<
      JobSpec,
      | "sqft"
      | "bedrooms"
      | "bathrooms"
      | "frequency"
      | "pets"
      | "addOns"
      | "suppliesProvided"
      | "accessNotes"
      | "conditionNotes"
    >
  > = {};
  const sqft = numberValue(payload.sqft);
  const bedrooms = numberValue(payload.bedrooms);
  const bathrooms = numberValue(payload.bathrooms);
  const frequency = frequencyValue(payload.frequency);
  const addOns = Array.isArray(payload.addOns)
    ? payload.addOns.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : typeof payload.addOns === "string"
      ? payload.addOns.split(",").map((item) => item.trim()).filter(Boolean)
      : undefined;
  const accessNotes = stringValue(payload.accessNotes);
  const conditionNotes = stringValue(payload.conditionNotes);

  if (sqft !== undefined) details.sqft = sqft;
  if (bedrooms !== undefined) details.bedrooms = bedrooms;
  if (bathrooms !== undefined) details.bathrooms = bathrooms;
  if (frequency !== undefined) details.frequency = frequency;
  const pets = booleanValue(payload.pets);
  const suppliesProvided = booleanValue(payload.suppliesProvided);

  if (pets !== undefined) details.pets = pets;
  if (addOns !== undefined) details.addOns = addOns;
  if (suppliesProvided !== undefined) {
    details.suppliesProvided = suppliesProvided;
  }
  if (accessNotes !== undefined) details.accessNotes = accessNotes;
  if (conditionNotes !== undefined) details.conditionNotes = conditionNotes;

  return details;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobSpecId: string }> },
) {
  const { jobSpecId } = await params;
  const payload = (await request.json()) as LiveInterviewPayload;
  const jobSpec = await createContainer().repos.jobSpecs.updateDraft(
    jobSpecId,
    interviewDetails(payload),
  );
  return NextResponse.json({ jobSpec });
}
