import { NextResponse } from "next/server";
import { submissions } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: submissions });
}
