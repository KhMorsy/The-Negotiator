import { NextResponse } from "next/server";
import { getIntakeOrchestrator } from "@/app/composition/createIntakeDeps";

export async function POST(request: Request) {
  const { geo } = (await request.json()) as { geo: string };
  return NextResponse.json(await getIntakeOrchestrator().startIntake(geo));
}
