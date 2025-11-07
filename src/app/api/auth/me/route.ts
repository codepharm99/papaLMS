import { NextResponse } from "next/server";
import { currentUser } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: currentUser });
}
