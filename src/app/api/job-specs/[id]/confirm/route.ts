import { NextResponse } from "next/server";
import { getJobSpecRepository } from "@/app/composition/jobSpecRepository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const repository = getJobSpecRepository();
  const existing = await repository.getById(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.sqft <= 0) return NextResponse.json({ error: "incomplete job spec" }, { status: 400 });
  return NextResponse.json({ jobSpec: await repository.confirm(id) });
}
