import { NextResponse } from "next/server";
import { registerStudent, registerTeacher } from "@/lib/mockdb";
import { setAuthCookie } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  USERNAME_TAKEN: "Такой логин уже используется",
  INVITE_REQUIRED: "Для регистрации преподавателя нужен код",
  INVITE_INVALID: "Неверный или уже использованный код",
};

export async function POST(req: Request) {
  const { username, password, name, role, inviteCode } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string" || typeof name !== "string" || typeof role !== "string") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!username.trim() || !password.trim() || !name.trim()) {
    return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
  }

  let result;
  if (role === "TEACHER") {
    result = await registerTeacher({ username, password, name, inviteCode });
  } else {
    result = await registerStudent({ username, password, name });
  }

  if ("error" in result) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] ?? "Не удалось зарегистрироваться" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, user: result.user });
  setAuthCookie(res, result.user);
  return res;
}
