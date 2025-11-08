import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createTestForTeacher, listTeacherTests } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const data = await listTeacherTests(me.id);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const res = await createTestForTeacher(me, { title: String(body.title ?? ""), description: body.description ? String(body.description) : undefined });
  if ("error" in res) {
    const status = res.error === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true, item: res.item });
}

