import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listStudentStatusesForTest } from "@/lib/mockdb";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Params) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await ctx.params;
  const res = await listStudentStatusesForTest(me, id);
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, TEST_NOT_FOUND: 404 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json(res.items);
}
