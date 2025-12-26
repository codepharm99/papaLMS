import { NextResponse } from "next/server";
import { registerStudent, registerTeacher } from "@/lib/mockdb";
import { setAuthCookie } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  USERNAME_TAKEN: "Такой логин уже используется",
  INVITE_REQUIRED: "Для регистрации преподавателя нужна ссылка-приглашение",
  INVITE_INVALID: "Неверная или уже использованная ссылка-приглашение",
  IIN_REQUIRED: "Нужен ИИН для регистрации преподавателя",
  IIN_INVALID: "ИИН должен состоять из 12 цифр",
  IIN_MISMATCH: "ИИН не совпадает с приглашением",
};

export async function POST(req: Request) {
  const { username, password, name, role, inviteCode, inviteToken, iin } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string" || typeof name !== "string" || typeof role !== "string") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!username.trim() || !password.trim() || !name.trim()) {
    return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
  }

  let result;
  if (role === "TEACHER") {
    result = await registerTeacher({ username, password, name, inviteCode, inviteToken, iin });
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
