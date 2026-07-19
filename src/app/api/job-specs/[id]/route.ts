import { NextResponse } from "next/server";
import { getJobSpecRepository } from "@/app/composition/jobSpecRepository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const jobSpec = await getJobSpecRepository().getById((await params).id);
  return jobSpec
    ? NextResponse.json({ jobSpec })
    : NextResponse.json({ error: "not found" }, { status: 404 });
}
