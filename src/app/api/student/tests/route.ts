import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listAssignmentsForStudent } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const data = await listAssignmentsForStudent(me.id);
  return NextResponse.json({ data });
}

