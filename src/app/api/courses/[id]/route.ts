import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getCourseView } from "@/lib/mockdb";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await currentUser(); // ← важно
  const data = await getCourseView(id, me);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: data });
}
