import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { setWeeklyScoreForTeacher } from "@/lib/mockdb";

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const week = Number.parseInt(String(body?.week ?? ""), 10);

  const toNum = (v: unknown) => {
    if (typeof v === "number") return v;
    const n = Number.parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const result = await setWeeklyScoreForTeacher(me.id, {
    courseId,
    studentId,
    week,
    lectureScore: toNum(body?.lectureScore),
    practiceScore: toNum(body?.practiceScore),
    individualWorkScore: toNum(body?.individualWorkScore),
    ratingScore: toNum(body?.ratingScore),
    midtermScore: toNum(body?.midtermScore),
    examScore: toNum(body?.examScore),
  });

  if ("error" in result) {
    const map: Record<string, number> = {
      FORBIDDEN: 403,
      COURSE_NOT_FOUND: 404,
      STUDENT_NOT_FOUND: 404,
      NOT_ENROLLED: 400,
      INVALID_WEEK: 400,
    };
    return NextResponse.json({ error: result.error }, { status: map[result.error] ?? 400 });
  }

  return NextResponse.json({ ok: true });
}
