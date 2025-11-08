import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getAssignmentQuestionsForStudent } from "@/lib/mockdb";

type Params = { params: Promise<{ aid: string }> };

export async function GET(_: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { aid } = await ctx.params;
  const res = await getAssignmentQuestionsForStudent(me, aid);
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, ASSIGNMENT_NOT_FOUND: 404 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, assignment: res.assignment, questions: res.questions });
}

