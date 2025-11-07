import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById, type User } from "@/lib/mockdb";

const COOKIE = "token";

export function setAuthCookie(res: NextResponse, user: User) {
  res.cookies.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value ?? null;
  return getUserById(token);
}