import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/data";

const DEMO_PASSWORD = "lms-demo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (email !== currentUser.email || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({
    token: "demo-token",
    user: currentUser,
    expiresIn: 3600,
  });
}

export async function GET() {
  return NextResponse.json({
    message: "POST email and password to obtain a mock token.",
    demoCredentials: { email: currentUser.email, password: DEMO_PASSWORD },
  });
}
