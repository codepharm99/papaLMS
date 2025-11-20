import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { publishTest } from "@/lib/mockdb";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await ctx.params;
  const res = await publishTest(me, id);
  if ("error" in res) {
    const status = res.error === "FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true, item: res.item });
}
