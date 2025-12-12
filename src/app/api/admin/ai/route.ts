import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { getOllamaConfig } from "@/lib/ollama";
import { prisma } from "@/lib/prisma";
import { addQuestionToTest, createTestForTeacher, setWeeklyScoreForTeacher } from "@/lib/mockdb";

type UpdateStudentAction = {
  type: "update_student";
  username: string;
  name?: string;
  role?: Role;
};

type UpsertWeeklyScoreAction = {
  type: "upsert_weekly_score";
  studentUsername: string;
  courseCode: string;
  week: number;
  part?: number;
  lectureScore?: number;
  practiceScore?: number;
  individualWorkScore?: number;
  ratingScore?: number;
  midtermScore?: number;
  examScore?: number;
};

type CreateTestAction = {
  type: "create_test";
  teacherUsername: string;
  title: string;
  description?: string;
  questions?: Array<{ text: string; options?: string[]; correctIndex?: number | null }>;
};

type Action = UpdateStudentAction | UpsertWeeklyScoreAction | CreateTestAction;

type Plan = { actions?: Action[]; reason?: string };
type PlanResult = { plan: Plan | null; raw?: string };

type ActionResult = {
  type: Action["type"];
  ok: boolean;
  detail: string;
  data?: unknown;
  error?: string;
};

const ACTION_MODEL = "gpt-oss:20b";
const MAX_ACTIONS = 10;

const SYSTEM_PROMPT = `
You are an LMS admin orchestrator. Map the admin's chat text to a JSON plan.
Always respond with a single JSON object matching this schema:
{
  "actions": [
    // zero or more actions
  ],
  "reason": "why you chose these actions (optional)"
}

Supported actions:
- update_student: { "type": "update_student", "username": "<login>", "name"?: "<display name>", "role"?: "STUDENT"|"TEACHER"|"ADMIN" }
- upsert_weekly_score: {
    "type": "upsert_weekly_score",
    "studentUsername": "<student login>",
    "courseCode": "<course code>",
    "week": <1-14>,
    "part"?: <1|2>,
    "lectureScore"?: <0-100>,
    "practiceScore"?: <0-100>,
    "individualWorkScore"?: <0-100>,
    "ratingScore"?: <0-100>,
    "midtermScore"?: <0-100>,
    "examScore"?: <0-100>
  }
- create_test: {
    "type": "create_test",
    "teacherUsername": "<teacher login>",
    "title": "<test title>",
    "description"?: "<optional description>",
    "questions"?: [
      { "text": "<question text>", "options"?: ["A","B",...], "correctIndex"?: <0-based index> }
    ]
  }

Rules:
- If required fields are missing, return "actions": [] with a helpful reason.
- Do NOT invent usernames, course codes, or weeks—only extract what the admin wrote.
- Prefer a single, minimal action list that matches the request. Maximum ${MAX_ACTIONS} actions.
- Output ONLY JSON. No markdown, no commentary.
`.trim();

const pickString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const pickNumber = (value: unknown) => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const normalizeUsername = (username: string) => username.trim().toLowerCase();

function stripJsonWrapper(text: string) {
  return text.replace(/```json|```/gi, "").trim();
}

function parseJsonPlan(raw: string): Plan | null {
  const cleaned = stripJsonWrapper(raw);
  const match = cleaned.match(/(\{[\s\S]*\})/);
  const candidate = match ? match[1] : cleaned;
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return { actions: parsed as Action[] };
    if (parsed && typeof parsed === "object") {
      if ("plan" in parsed && parsed.plan && typeof parsed.plan === "object") {
        return parsed.plan as Plan;
      }
      return parsed as Plan;
    }
    return null;
  } catch {
    return null;
  }
}

async function callModel(message: string): Promise<PlanResult> {
  const { baseUrl } = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ACTION_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    const plan = parseJsonPlan(text);
    return { plan, raw: text };
  } catch {
    clearTimeout(timeout);
    return { plan: null };
  }
}

async function handleUpdateStudent(action: UpdateStudentAction): Promise<ActionResult> {
  const username = normalizeUsername(action.username || "");
  if (!username) return { type: action.type, ok: false, detail: "Username is required", error: "USERNAME_REQUIRED" };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { type: action.type, ok: false, detail: `User ${username} not found`, error: "USER_NOT_FOUND" };

  const data: Partial<{ name: string; role: Role }> = {};
  if (action.name) data.name = action.name.trim();
  if (action.role) data.role = action.role;

  if (Object.keys(data).length === 0) {
    return { type: action.type, ok: true, detail: "No changes to apply", data: { id: user.id, username } };
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return {
    type: action.type,
    ok: true,
    detail: `Updated ${updated.username}`,
    data: { id: updated.id, username: updated.username, role: updated.role, name: updated.name },
  };
}

async function handleWeeklyScore(action: UpsertWeeklyScoreAction): Promise<ActionResult> {
  const username = normalizeUsername(action.studentUsername || "");
  const courseCode = pickString(action.courseCode || "");
  const week = pickNumber(action.week);

  if (!username || !courseCode || week == null) {
    return { type: action.type, ok: false, detail: "studentUsername, courseCode, and week are required", error: "MISSING_FIELDS" };
  }

  const student = await prisma.user.findUnique({ where: { username } });
  if (!student || student.role !== "STUDENT") {
    return { type: action.type, ok: false, detail: `Student ${username} not found`, error: "STUDENT_NOT_FOUND" };
  }

  const course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (!course) {
    return { type: action.type, ok: false, detail: `Course ${courseCode} not found`, error: "COURSE_NOT_FOUND" };
  }

  const res = await setWeeklyScoreForTeacher(course.teacherId, {
    courseId: course.id,
    studentId: student.id,
    week,
    part: pickNumber(action.part) ?? undefined,
    lectureScore: pickNumber(action.lectureScore) ?? undefined,
    practiceScore: pickNumber(action.practiceScore) ?? undefined,
    individualWorkScore: pickNumber(action.individualWorkScore) ?? undefined,
    ratingScore: pickNumber(action.ratingScore) ?? undefined,
    midtermScore: pickNumber(action.midtermScore) ?? undefined,
    examScore: pickNumber(action.examScore) ?? undefined,
  });

  if ("error" in res) {
    return { type: action.type, ok: false, detail: `Failed to set score: ${res.error}`, error: res.error };
  }

  return {
    type: action.type,
    ok: true,
    detail: `Updated scores for ${username} in ${courseCode} (week ${week})`,
    data: { studentId: student.id, courseId: course.id, week },
  };
}

async function handleCreateTest(action: CreateTestAction): Promise<ActionResult> {
  const teacherUsername = normalizeUsername(action.teacherUsername || "");
  const title = pickString(action.title);

  if (!teacherUsername || !title) {
    return { type: action.type, ok: false, detail: "teacherUsername and title are required", error: "MISSING_FIELDS" };
  }

  const teacher = await prisma.user.findUnique({ where: { username: teacherUsername } });
  if (!teacher || teacher.role !== "TEACHER") {
    return { type: action.type, ok: false, detail: `Teacher ${teacherUsername} not found`, error: "TEACHER_NOT_FOUND" };
  }

  const created = await createTestForTeacher(
    { id: teacher.id, name: teacher.name, username: teacher.username, role: teacher.role },
    { title, description: pickString(action.description) || undefined }
  );
  if ("error" in created) {
    return { type: action.type, ok: false, detail: `Failed to create test: ${created.error}`, error: created.error };
  }

  let added = 0;
  if (Array.isArray(action.questions)) {
    for (const q of action.questions) {
      const text = pickString(q?.text);
      if (!text) continue;
      const options = Array.isArray(q?.options) ? q.options.map(pickString).filter(Boolean) : undefined;
      const correctIndex = q?.correctIndex == null ? null : pickNumber(q.correctIndex);
      const questionRes = await addQuestionToTest(
        { id: teacher.id, name: teacher.name, username: teacher.username, role: teacher.role },
        created.item.id,
        { text, options: options && options.length > 0 ? options : undefined, correctIndex: correctIndex ?? undefined }
      );
      if ("ok" in questionRes) added += 1;
    }
  }

  return {
    type: action.type,
    ok: true,
    detail: `Created test "${created.item.title}" for ${teacherUsername}${added ? ` (${added} questions)` : ""}`,
    data: { testId: created.item.id, questionsAdded: added },
  };
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const message = pickString(body?.message ?? "");
  if (!message) {
    return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const { plan, raw } = await callModel(message);
  if (!plan) return NextResponse.json({ ok: false, error: "MODEL_PLAN_FAILED", raw }, { status: 200 });

  const actions = Array.isArray(plan.actions) ? plan.actions.slice(0, MAX_ACTIONS) : [];
  const results: ActionResult[] = [];

  for (const action of actions) {
    if (action.type === "update_student") {
      results.push(await handleUpdateStudent(action));
    } else if (action.type === "upsert_weekly_score") {
      results.push(await handleWeeklyScore(action));
    } else if (action.type === "create_test") {
      results.push(await handleCreateTest(action));
    } else {
      results.push({ type: action.type, ok: false, detail: "Unsupported action", error: "UNSUPPORTED_ACTION" });
    }
  }

  return NextResponse.json({
    ok: true,
    model: ACTION_MODEL,
    actions: actions.length,
    results,
    reason: plan.reason,
  });
}
