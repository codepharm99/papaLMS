import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteQuestionFromTest, updateQuestionInTest } from "@/lib/mockdb";

type Params = { params: Promise<{ id: string; qid: string }> };

export async function PATCH(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, qid } = await ctx.params;
  const res = await updateQuestionInTest(me, id, qid, {
    text: body.text,
    options: body.options ?? undefined,
    correctIndex: body.correctIndex ?? undefined,
  });
  if ("error" in res) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      TEST_NOT_FOUND: 404,
      QUESTION_NOT_FOUND: 404,
      INVALID_OPTIONS: 400,
      TEXT_REQUIRED: 400,
    };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, item: res.item });
}

export async function DELETE(_: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id, qid } = await ctx.params;
  const res = await deleteQuestionFromTest(me, id, qid);
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, TEST_NOT_FOUND: 404, QUESTION_NOT_FOUND: 404 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true });
}
