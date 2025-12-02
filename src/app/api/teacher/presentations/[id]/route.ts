import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "NO_ID" }, { status: 400 });

  const existing = await prisma.presentation.findFirst({ where: { id, teacherId: me.id } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.presentation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
