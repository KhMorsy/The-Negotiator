import { NextResponse } from "next/server";
import { getIntakeOrchestrator } from "@/app/composition/createIntakeDeps";

export async function POST(request: Request) {
  const form = await request.formData();
  const jobSpecId = String(form.get("jobSpecId"));
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const jobSpec = await getIntakeOrchestrator().applyQuoteDocument(
    jobSpecId,
    new Uint8Array(await file.arrayBuffer()),
    file.type || "application/octet-stream",
  );
  return NextResponse.json({ jobSpec });
}
