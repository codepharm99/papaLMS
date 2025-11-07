import { NextRequest, NextResponse } from "next/server";
import { courses } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const course = courses.find((item) => item.id === id);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    return NextResponse.json({ data: course });
  }

  return NextResponse.json({ data: courses });
}
