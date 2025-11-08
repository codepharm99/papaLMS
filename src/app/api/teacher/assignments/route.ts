import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { assignTestToStudent } from "@/lib/mockdb";

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const testId = String(body.testId ?? "");
  const studentId = String(body.studentId ?? "");
  const dueAt = body.dueAt ? String(body.dueAt) : null;
  const res = await assignTestToStudent(me, { testId, studentId, dueAt });
  if ("error" in res) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, TEST_NOT_FOUND: 404, STUDENT_NOT_FOUND: 404, INVALID_DUE: 400 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, item: res.item });
}

