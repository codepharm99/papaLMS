import { NextResponse } from "next/server";
import { announcements } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: announcements });
}
