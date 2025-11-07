import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const me = currentUser();
  if (!me) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: me.id, name: me.name, role: me.role } });
}