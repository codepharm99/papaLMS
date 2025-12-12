import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listStudentsForAdmin } from "@/lib/mockdb";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await listStudentsForAdmin();
  return NextResponse.json({ items });
}
