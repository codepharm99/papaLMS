import { NextRequest, NextResponse } from "next/server";
import { getCourseById } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { courseId, student } = body;

  if (!courseId || !student) {
    return NextResponse.json(
      { error: "courseId and student fields are required" },
      { status: 400 }
    );
  }

  const course = getCourseById(courseId);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: "Enrollment request captured",
    reference: `enroll_${Date.now()}`,
    course: { id: course.id, title: course.title },
    student,
  });
}
