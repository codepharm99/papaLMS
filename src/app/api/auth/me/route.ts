import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await currentUser(); // ← важно
  if (!me) return NextResponse.json({ user: null });
  let avatarUrl: string | null = null;
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: me.id },
      select: { avatarUrl: true },
    });
    avatarUrl = profile?.avatarUrl ?? null;
  } catch {
    avatarUrl = null;
  }
  return NextResponse.json({ user: { id: me.id, name: me.name, role: me.role, avatarUrl } });
}
