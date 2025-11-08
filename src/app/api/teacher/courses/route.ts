import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createCourseForTeacher, listTeacherCourses } from "@/lib/mockdb";

const errorMessages: Record<string, string> = {
  TITLE_REQUIRED: "Укажите название курса",
  CODE_REQUIRED: "Укажите код курса",
  ORG_REQUIRED: "Укажите организационный тег",
  CODE_CONFLICT: "Курс с таким кодом уже существует",
  FORBIDDEN: "Недостаточно прав",
};

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await listTeacherCourses(me.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const result = await createCourseForTeacher(me, {
    title: String(body.title ?? ""),
    code: String(body.code ?? ""),
    orgTag: String(body.orgTag ?? ""),
    description: typeof body.description === "string" ? body.description : undefined,
  });
  if ("error" in result) {
    return NextResponse.json({ error: errorMessages[result.error] ?? "Не удалось создать курс" }, { status: 400 });
  }
  return NextResponse.json({ item: result.item });
}
