import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { submitAssignmentAnswers } from "@/lib/mockdb";

type Params = { params: Promise<{ aid: string }> };

export async function POST(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { aid } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const answers = (body?.answers ?? {}) as Record<string, number | string | null>;
  const res = await submitAssignmentAnswers(me, aid, answers);
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, ASSIGNMENT_NOT_FOUND: 404, ALREADY_SUBMITTED: 409 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, score: res.score, total: res.total });
}

