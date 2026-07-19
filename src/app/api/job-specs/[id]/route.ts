import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const jobSpec = await createContainer().repos.jobSpecs.getById((await params).id);
  return jobSpec
    ? NextResponse.json({ jobSpec })
    : NextResponse.json({ error: "not found" }, { status: 404 });
}
