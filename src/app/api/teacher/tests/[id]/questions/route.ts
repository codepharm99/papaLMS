import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addQuestionToTest, listQuestionsForTest } from "@/lib/mockdb";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "");
  const options = Array.isArray(body.options) ? body.options.map((v: unknown) => String(v ?? "")) : undefined;
  const correctIndex = body.correctIndex == null ? null : Number(body.correctIndex);
  const { id } = await ctx.params;
  const res = await addQuestionToTest(me, id, { text, options, correctIndex });
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
