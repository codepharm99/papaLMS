import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listCourses } from "@/lib/mockdb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const mine = searchParams.get("mine") === "1";

  const me = await currentUser(); // ← важно
  const data = await listCourses({ me, q, mine });
  return NextResponse.json({ items: data });
}
