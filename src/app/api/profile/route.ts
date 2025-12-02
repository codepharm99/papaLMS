// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    const url = new URL(req.url);
    const debug = url.searchParams.get("_debug") === "1";
    if (debug) {
      // For debug mode return which cookies the server sees and whether currentUser resolved.
      const cookieHeader = req.headers.get("cookie") ?? "";
      const candidateNames = ["token", "next-auth.session-token", "next-auth.csrf-token", "next-auth.callback-url"];
      const present = candidateNames.filter((n) => cookieHeader.includes(n));
      return NextResponse.json({ debug: { presentCookies: present, cookieHeaderSnippet: cookieHeader.slice(0, 300), userResolved: !!user } });
    }
    if (!user) throw new Error("Unauthenticated");
    // получаем профиль, если есть — иначе null
    let profile = null;
    try {
      profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    } catch (e) {
      // If the Profile table doesn't exist (dev/migration drift), don't fail the whole request.
      // Log and continue with profile = null so UI can render and offer to create a profile.
      console.warn("Profile lookup failed (table may be missing)", e);
      profile = null;
    }

    // подтянем email из базы (mock `user` может не содержать email)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    return NextResponse.json({ user: { id: user.id, email: dbUser?.email ?? null }, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unauthenticated" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthenticated");
    const payload = await req.json();

    // Простая валидация:
    const updates: any = {};
    if (typeof payload.fullName === "string") updates.fullName = payload.fullName;
    if (typeof payload.bio === "string") updates.bio = payload.bio;
    if (typeof payload.avatarUrl === "string") updates.avatarUrl = payload.avatarUrl;
    if (payload.settings !== undefined) updates.settings = payload.settings;

    // upsert: если профиля нет — создаём, иначе обновляем
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...updates },
      update: updates,
    });

    return NextResponse.json({ profile });
  } catch (err: any) {
    // 401 для неавторизованных, 400/500 для прочих ошибок
    const status = err?.message === "Unauthenticated" ? 401 : 400;
    return NextResponse.json({ error: err?.message ?? "Bad request" }, { status });
  }
}
