import { NextResponse } from "next/server";
import { attendanceRecords } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: attendanceRecords });
}
