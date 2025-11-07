import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMaterials, addMaterial } from "@/lib/mockdb";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const items = listMaterials(id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await currentUser(); // ← важно
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = addMaterial(id, { title: body.title, description: body.description, url: body.url }, me);
  if ("error" in r) {
    const map: Record<string, number> = { FORBIDDEN: 403, COURSE_NOT_FOUND: 404, TITLE_REQUIRED: 400 };
    return NextResponse.json({ error: r.error }, { status: map[r.error] ?? 400 });
  }
  return NextResponse.json({ item: r.item });
}