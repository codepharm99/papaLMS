import { NextResponse } from "next/server";
import { getPublishedTestByCode } from "@/lib/mockdb";

type Params = { params: Promise<{ code: string }> };

export async function GET(_: Request, ctx: Params) {
  const { code } = await ctx.params;
  const res = await getPublishedTestByCode(code);
  if ("error" in res) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, test: res.test, questions: res.questions });
}
