import { NextResponse } from "next/server";
import { grades } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: grades });
}
