import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(request: Request) {
  const { geo } = (await request.json()) as { geo: string };
  return NextResponse.json(await createContainer().intakeOrchestrator.startIntake(geo));
}
