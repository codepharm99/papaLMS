import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addQuestionToTest, deleteQuestionFromTest, listQuestionsForTest, updateQuestionInTest } from "@/lib/mockdb";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "");
  const options = Array.isArray(body.options) ? body.options.map((v: unknown) => String(v ?? "")) : undefined;
  const correctIndex = body.correctIndex == null ? null : Number(body.correctIndex);
  const correctIndices = Array.isArray(body.correctIndices)
    ? body.correctIndices.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v))
    : undefined;
  const answerText = typeof body.answerText === "string" ? body.answerText : null;
  const { id } = await ctx.params;
  const res = await addQuestionToTest(me, id, { text, options, correctIndex, correctIndices, answerText });
  if ("error" in res) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      TEST_NOT_FOUND: 404,
      TEXT_REQUIRED: 400,
      INVALID_OPTIONS: 400,
      PUBLISHED: 409,
    };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, item: res.item });
}

export async function PATCH(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const questionId = String(body.id ?? "");
  if (!questionId) return NextResponse.json({ error: "QUESTION_REQUIRED" }, { status: 400 });
  const text = body.text !== undefined ? String(body.text ?? "") : undefined;
  const options = body.options === undefined
    ? undefined
    : Array.isArray(body.options)
      ? body.options.map((v: unknown) => String(v ?? ""))
      : null;
  const correctIndex = body.correctIndex === undefined ? undefined : body.correctIndex == null ? null : Number(body.correctIndex);
  const correctIndices = body.correctIndices === undefined
    ? undefined
    : Array.isArray(body.correctIndices)
      ? body.correctIndices.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v))
      : null;
  const answerText = body.answerText === undefined ? undefined : typeof body.answerText === "string" ? body.answerText : null;
  const { id } = await ctx.params;
  const res = await updateQuestionInTest(me, id, questionId, { text, options, correctIndex, correctIndices, answerText });
  if ("error" in res) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      TEST_NOT_FOUND: 404,
      QUESTION_NOT_FOUND: 404,
      INVALID_OPTIONS: 400,
      TEXT_REQUIRED: 400,
      PUBLISHED: 409,
    };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, item: res.item });
}

export async function DELETE(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const questionId = String(body.id ?? "");
  if (!questionId) return NextResponse.json({ error: "QUESTION_REQUIRED" }, { status: 400 });
  const { id } = await ctx.params;
  const res = await deleteQuestionFromTest(me, id, questionId);
  if ("error" in res) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      TEST_NOT_FOUND: 404,
      QUESTION_NOT_FOUND: 404,
      PUBLISHED: 409,
    };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await ctx.params;
  const res = await listQuestionsForTest(me, id);
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, TEST_NOT_FOUND: 404 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, test: res.test, items: res.items });
}
