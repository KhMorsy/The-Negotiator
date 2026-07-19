import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(request: Request) {
  const form = await request.formData();
  const jobSpecId = String(form.get("jobSpecId") ?? "");
  if (!jobSpecId) {
    return NextResponse.json({ error: "jobSpecId required" }, { status: 400 });
  }

  const files = form.getAll("photos").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "photos required" }, { status: 400 });
  }

  const images = await Promise.all(
    files.map(async (file) => ({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
    })),
  );

  const jobSpec = await createContainer().intakeOrchestrator.mergeRoomPhotos(
    jobSpecId,
    images,
  );
  return NextResponse.json({ jobSpec });
}
