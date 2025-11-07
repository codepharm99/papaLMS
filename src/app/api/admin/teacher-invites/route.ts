import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createTeacherInvite, listTeacherInvites } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await listTeacherInvites();
  return NextResponse.json({ items });
}

export async function POST() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await createTeacherInvite(me);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ invite: result.invite });
}
