import { NextResponse } from "next/server";
import { submitGuestAttempt } from "@/lib/mockdb";

type Params = { params: Promise<{ code: string }> };

export async function POST(req: Request, ctx: Params) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "");
  const answers = (body.answers ?? {}) as Record<string, number | string | null>;
  const res = await submitGuestAttempt(code, name, answers);
  if ("error" in res) {
    const status = res.error === "NAME_REQUIRED" ? 400 : 404;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true, score: res.score, total: res.total });
}
