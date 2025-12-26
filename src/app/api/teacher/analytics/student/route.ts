import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getTeacherStudentAnalytics } from "@/lib/mockdb";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const studentId = String(searchParams.get("studentId") ?? "");
  if (!studentId) return NextResponse.json({ error: "STUDENT_REQUIRED" }, { status: 400 });

  const res = await getTeacherStudentAnalytics(me.id, studentId);
  if ("error" in res) {
    const statusMap: Record<string, number> = { STUDENT_NOT_FOUND: 404, FORBIDDEN: 403 };
    return NextResponse.json({ error: res.error }, { status: statusMap[res.error] ?? 400 });
  }

  return NextResponse.json({ data: res.data });
}
