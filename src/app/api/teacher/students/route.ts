import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listStudents } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const data = await listStudents();
  return NextResponse.json({ data });
}

