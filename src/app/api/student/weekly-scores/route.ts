import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listWeeklyScoresForStudent } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await listWeeklyScoresForStudent(me.id);
  return NextResponse.json({ items });
}
