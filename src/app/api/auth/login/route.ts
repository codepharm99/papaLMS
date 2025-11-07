import { NextResponse } from "next/server";
import { findUserByCreds } from "@/lib/mockdb";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const user = findUserByCreds(username, password);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Неверные данные" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  setAuthCookie(res, user);
  return res;
}