import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listWeeklyScoresForTeacher, setWeeklyScoreForTeacher } from "@/lib/mockdb";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId") ?? "";
  const week = Number.parseInt(String(searchParams.get("week") ?? ""), 10);

  const result = await listWeeklyScoresForTeacher(me.id, courseId, week);
  if ("error" in result) {
    const map: Record<string, number> = {
      FORBIDDEN: 403,
      COURSE_NOT_FOUND: 404,
      INVALID_WEEK: 400,
    };
    return NextResponse.json({ error: result.error }, { status: map[result.error] ?? 400 });
  }

  return NextResponse.json({ items: result.items });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const week = Number.parseInt(String(body?.week ?? ""), 10);
  const part =
    body?.part === null || body?.part === undefined
      ? undefined
      : Number.isFinite(Number(body?.part))
        ? Number(body?.part)
        : undefined;

  const toNum = (v: unknown) => {
    if (typeof v === "number") return v;
    const n = Number.parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const result = await setWeeklyScoreForTeacher(me.id, {
    courseId,
    studentId,
    week,
    part,
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
