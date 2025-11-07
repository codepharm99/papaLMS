import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { toggleEnroll } from "@/lib/mockdb";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const me = await currentUser(); // ← важно
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await toggleEnroll(id, me);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item: updated });
}
