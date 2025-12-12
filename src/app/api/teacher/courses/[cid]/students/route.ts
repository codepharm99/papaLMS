import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listCourseStudentsForTeacher } from "@/lib/mockdb";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ cid: string }> }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { cid } = await ctx.params;
  const items = await listCourseStudentsForTeacher(me.id, cid);
  return NextResponse.json({ items });
}
