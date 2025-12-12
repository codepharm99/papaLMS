import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { Prisma, type Role as DbRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Role = DbRole;

export type User = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  teacherId: string;
  enrolledCount: number;
  isEnrolled: boolean;
};

export type CourseDetail = Course & { teacherName: string };

export type Material = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  url?: string | null;
  description?: string | null;
  publicCode?: string | null;
  publishedAt?: number | null;
  createdAt: number;
};

export type TeacherCourse = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  description?: string | null;
  createdAt: number;
};

export type TeacherInviteInfo = {
  id: string;
  code: string;
  createdAt: number;
  createdBy: { id: string; name: string };
  usedAt?: number | null;
  usedBy?: { id: string; name: string } | null;
};

export type TestItem = {
  id: string;
  title: string;
  description?: string | null;
  publicCode?: string | null;
  publishedAt?: number | null;
  createdAt: number;
};

export type QuestionItem = {
  id: string;
  testId: string;
  text: string;
  options?: string[] | null;
  correctIndex?: number | null;
  createdAt: number;
};

export type TestAssignmentItem = {
  id: string;
  testId: string;
  student: { id: string; name: string };
  dueAt?: number | null;
  status: string;
  createdAt: number;
};

export type TestStudentStatus = {
  id: string;
  name: string;
  status: string;
  timestamp: number;
};

export type GuestAttempt = {
  id: string;
  name: string;
  score: number;
  total: number;
  createdAt: number;
};

export type TeacherAnalytics = {
  summary: {
    testsTotal: number;
    publishedTests: number;
    questionsTotal: number;
    avgQuestionsPerTest: number;
    assignmentsTotal: number;
    completedAssignments: number;
    completionRate: number;
    uniqueStudents: number;
    upcomingDue: number;
    guestAttemptsTotal: number;
    avgGuestScore: number;
  };
  status: {
    assigned: number;
    inProgress: number;
    completed: number;
  };
  recentTests: Array<{
    id: string;
    title: string;
    createdAt: number;
    publishedAt?: number | null;
    questions: number;
    assignments: number;
    completedAssignments: number;
    completionRate: number;
    guestAttempts: number;
    avgGuestScore: number;
  }>;
  topStudents: Array<{
    id: string;
    name: string;
    totalAssignments: number;
    completedAssignments: number;
  }>;
};

const PASSWORD_SALT_ROUNDS = 10;

const sanitizeUser = (user: { id: string; username: string; name: string; role: Role } | null): User | null =>
  user ? { id: user.id, username: user.username, name: user.name, role: user.role } : null;

const sanitizeInvite = (invite: {
  id: string;
  code: string;
  createdAt: Date;
  createdBy: { id: string; name: string };
  usedAt: Date | null;
  usedBy: { id: string; name: string } | null;
}): TeacherInviteInfo => ({
  id: invite.id,
  code: invite.code,
  createdAt: invite.createdAt.getTime(),
  createdBy: invite.createdBy,
  usedAt: invite.usedAt?.getTime(),
  usedBy: invite.usedBy ? { id: invite.usedBy.id, name: invite.usedBy.name } : null,
});

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const normalizeName = (name: string) => name.trim();

export async function findUserByCreds(username: string, password: string): Promise<User | null> {
  if (!username || !password) return null;
  const user = await prisma.user.findUnique({ where: { username: normalizeUsername(username) } });
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;
  return sanitizeUser(user);
}

export async function getUserById(id?: string | null): Promise<User | null> {
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return sanitizeUser(user);
}

export async function listCourses(params: { me?: User | null; q?: string; mine?: boolean }): Promise<Course[]> {
  const { me, q, mine } = params;
  const query = q?.trim();
  const filters = {
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
            { orgTag: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(mine && me
      ? {
          enrollments: {
            some: { userId: me.id },
          },
        }
      : {}),
  };

  const courses = await prisma.course.findMany({
    where: filters,
    orderBy: { code: "asc" },
    include: {
      enrollments: true,
    },
  });

  return courses.map(course => {
    const enrolledCount = course.enrollments.length;
    const isEnrolled = !!me && course.enrollments.some(enr => enr.userId === me.id);
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      orgTag: course.orgTag,
      teacherId: course.teacherId,
      enrolledCount,
      isEnrolled,
    };
  });
}

export async function toggleEnroll(courseId: string, user: User) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  if (existing) {
    await prisma.enrollment.delete({ where: { id: existing.id } });
  } else {
    await prisma.enrollment.create({ data: { userId: user.id, courseId } });
  }

  return getCourseSummary(courseId, user.id);
}

async function getCourseSummary(courseId: string, meId?: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      enrollments: true,
    },
  });
  if (!course) return null;

  const enrolledCount = course.enrollments.length;
  const isEnrolled = !!meId && course.enrollments.some(enr => enr.userId === meId);

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    orgTag: course.orgTag,
    teacherId: course.teacherId,
    enrolledCount,
    isEnrolled,
  };
}

export async function getCourseView(courseId: string, me: User | null): Promise<CourseDetail | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      enrollments: true,
    },
  });
  if (!course) return null;

  const enrolledCount = course.enrollments.length;
  const isEnrolled = !!me && course.enrollments.some(en => en.userId === me.id);

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    orgTag: course.orgTag,
    teacherId: course.teacherId,
    teacherName: course.teacher.name,
    enrolledCount,
    isEnrolled,
  };
}

export async function listMaterials(courseId: string): Promise<Material[]> {
  const materials = await prisma.material.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
  });
  return materials.map(m => ({
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    description: m.description,
    url: m.url,
    createdAt: m.createdAt.getTime(),
  }));
}

export async function addMaterial(
  courseId: string,
  props: { title: string; description?: string; url?: string },
  me: User
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "COURSE_NOT_FOUND" as const } as const;
  if (course.teacherId !== me.id) return { error: "FORBIDDEN" as const } as const;

  const title = String(props.title ?? "").trim();
  if (!title) return { error: "TITLE_REQUIRED" as const } as const;

  const material = await prisma.material.create({
    data: {
      courseId,
      teacherId: me.id,
      title,
      description: props.description?.trim() || null,
      url: props.url?.trim() || null,
    },
  });

  return {
    ok: true as const,
    item: {
      id: material.id,
      courseId: material.courseId,
      title: material.title,
      description: material.description,
      url: material.url,
      createdAt: material.createdAt.getTime(),
    },
  };
}

export async function listTeacherCourses(teacherId: string): Promise<TeacherCourse[]> {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
  return courses.map(mapTeacherCourse);
}

export async function createCourseForTeacher(
  teacher: User,
  data: { title: string; code: string; orgTag: string; description?: string }
) {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" as const } as const;

  const title = normalizeName(data.title);
  const code = data.code.trim().toUpperCase();
  const orgTag = data.orgTag.trim().toUpperCase();
  const description = data.description?.trim();
  if (!title) return { error: "TITLE_REQUIRED" as const } as const;
  if (!code) return { error: "CODE_REQUIRED" as const } as const;
  if (!orgTag) return { error: "ORG_REQUIRED" as const } as const;

  try {
    const created = await prisma.course.create({
      data: { title, code, orgTag, description, teacherId: teacher.id },
    });
    return { ok: true as const, item: mapTeacherCourse(created) };
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2002") {
      return { error: "CODE_CONFLICT" as const } as const;
    }
    throw err;
  }
}

type RegisterResult = { ok: true; user: User } | { error: "USERNAME_TAKEN" | "INVITE_REQUIRED" | "INVITE_INVALID" };

export async function registerStudent(data: { username: string; name: string; password: string }): Promise<RegisterResult> {
  const username = normalizeUsername(data.username);
  const name = normalizeName(data.name);
  const password = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: { username, name, password, role: "STUDENT" },
      select: { id: true, username: true, name: true, role: true },
    });
    return { ok: true, user };
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2002") {
      return { error: "USERNAME_TAKEN" };
    }
    throw err;
  }
}

export async function registerTeacher(data: {
  username: string;
  name: string;
  password: string;
  inviteCode?: string;
}): Promise<RegisterResult> {
  const code = data.inviteCode?.trim().toUpperCase();
  if (!code) return { error: "INVITE_REQUIRED" };

  const invite = await prisma.teacherInvite.findUnique({
    where: { code },
    include: { usedBy: true },
  });
  if (!invite || invite.usedById) return { error: "INVITE_INVALID" };

  const username = normalizeUsername(data.username);
  const name = normalizeName(data.name);
  const password = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { username, name, password, role: "TEACHER" },
      select: { id: true, username: true, name: true, role: true },
    });
    await prisma.teacherInvite.update({
      where: { id: invite.id },
      data: { usedById: user.id, usedAt: new Date() },
    });
    return { ok: true, user };
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2002") {
      return { error: "USERNAME_TAKEN" };
    }
    throw err;
  }
}

export async function createTeacherInvite(admin: User) {
  if (admin.role !== "ADMIN") return { error: "FORBIDDEN" as const };
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = randomBytes(4).toString("hex").toUpperCase();
    const exists = await prisma.teacherInvite.findUnique({ where: { code } });
    if (!exists) break;
  }
  const invite = await prisma.teacherInvite.create({
    data: { code, createdById: admin.id },
    include: { createdBy: true, usedBy: true },
  });
  return { ok: true as const, invite: sanitizeInvite(invite) };
}

export async function listTeacherInvites(): Promise<TeacherInviteInfo[]> {
  const invites = await prisma.teacherInvite.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true, usedBy: true },
  });
  return invites.map(sanitizeInvite);
}

function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function mapTeacherCourse(course: {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  description: string | null;
  createdAt: Date;
}): TeacherCourse {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    orgTag: course.orgTag,
    description: course.description,
    createdAt: course.createdAt.getTime(),
  };
}

export async function listTeacherTests(teacherId: string): Promise<TestItem[]> {
  const tests = await prisma.test.findMany({ where: { teacherId }, orderBy: { createdAt: "desc" } });
  return tests.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    publicCode: t.publicCode,
    publishedAt: t.publishedAt?.getTime() ?? null,
    createdAt: t.createdAt.getTime(),
  }));
}

export async function createTestForTeacher(
  teacher: User,
  data: { title: string; description?: string }
): Promise<{ ok: true; item: TestItem } | { error: "FORBIDDEN" | "TITLE_REQUIRED" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const title = normalizeName(data.title);
  const description = data.description?.trim();
  if (!title) return { error: "TITLE_REQUIRED" };
  const t = await prisma.test.create({ data: { title, description, teacherId: teacher.id } });
  return {
    ok: true,
    item: {
      id: t.id,
      title: t.title,
      description: t.description,
      publicCode: t.publicCode,
      publishedAt: t.publishedAt?.getTime() ?? null,
      createdAt: t.createdAt.getTime(),
    },
  };
}

export async function addQuestionToTest(
  teacher: User,
  testId: string,
  data: { text: string; options?: string[]; correctIndex?: number | null }
): Promise<{ ok: true; item: QuestionItem } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" | "TEXT_REQUIRED" | "INVALID_OPTIONS" | "PUBLISHED" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  if (test.publishedAt) return { error: "PUBLISHED" };
  const text = String(data.text ?? "").trim();
  if (!text) return { error: "TEXT_REQUIRED" };
  let options: string[] | null = null;
  let correctIndex: number | null = null;
  if (data.options && data.options.length > 0) {
    options = data.options.map(o => String(o ?? "").trim()).filter(Boolean);
    if (options.length === 0) options = null;
    if (options && data.correctIndex != null) {
      if (data.correctIndex < 0 || data.correctIndex >= options.length) return { error: "INVALID_OPTIONS" };
      correctIndex = data.correctIndex;
    }
  }
  const q = await prisma.question.create({
    data: { testId, text, options: options ? (options as unknown as Prisma.InputJsonValue) : undefined, correctIndex },
  });
  return {
    ok: true,
    item: {
      id: q.id,
      testId: q.testId,
      text: q.text,
      options: (q.options as unknown as string[] | null) ?? null,
      correctIndex: q.correctIndex ?? null,
      createdAt: q.createdAt.getTime(),
    },
  };
}

export async function listQuestionsForTest(
  teacher: User,
  testId: string
): Promise<{ ok: true; test: TestItem; items: QuestionItem[] } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  const qs = await prisma.question.findMany({ where: { testId }, orderBy: { createdAt: "asc" } });
  const items: QuestionItem[] = qs.map(q => ({
    id: q.id,
    testId: q.testId,
    text: q.text,
    options: (q.options as unknown as string[] | null) ?? null,
    correctIndex: q.correctIndex ?? null,
    createdAt: q.createdAt.getTime(),
  }));
  const testItem: TestItem = {
    id: test.id,
    title: test.title,
    description: test.description,
    publicCode: test.publicCode,
    publishedAt: test.publishedAt?.getTime() ?? null,
    createdAt: test.createdAt.getTime(),
  };
  return { ok: true, test: testItem, items };
}

export async function updateQuestionInTest(
  teacher: User,
  testId: string,
  questionId: string,
  data: { text?: string; options?: string[] | null; correctIndex?: number | null }
): Promise<{ ok: true; item: QuestionItem } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" | "QUESTION_NOT_FOUND" | "INVALID_OPTIONS" | "TEXT_REQUIRED" | "PUBLISHED" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  if (test.publishedAt) return { error: "PUBLISHED" };
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q || q.testId !== testId) return { error: "QUESTION_NOT_FOUND" };

  const updates: Prisma.QuestionUpdateInput = {};
  if (data.text != null) {
    const t = String(data.text).trim();
    if (!t) return { error: "TEXT_REQUIRED" };
    updates.text = t;
  }
  if (data.options !== undefined) {
    const options = data.options?.map(o => String(o ?? "").trim()).filter(Boolean) ?? null;
    if (options && data.correctIndex != null) {
      if (data.correctIndex < 0 || data.correctIndex >= options.length) return { error: "INVALID_OPTIONS" };
      updates.correctIndex = data.correctIndex;
    } else if (data.correctIndex === null) {
      updates.correctIndex = null;
    }
    updates.options = options ? (options as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
  } else if (data.correctIndex != null) {
    // Only change correct index when options exist on the question
    const opts = (q.options as unknown as string[] | null) ?? null;
    if (!opts) return { error: "INVALID_OPTIONS" };
    if (data.correctIndex < 0 || data.correctIndex >= opts.length) return { error: "INVALID_OPTIONS" };
    updates.correctIndex = data.correctIndex;
  }

  const uq = await prisma.question.update({ where: { id: questionId }, data: updates });
  return {
    ok: true,
    item: {
      id: uq.id,
      testId: uq.testId,
      text: uq.text,
      options: (uq.options as unknown as string[] | null) ?? null,
      correctIndex: uq.correctIndex ?? null,
      createdAt: uq.createdAt.getTime(),
    },
  };
}

export async function deleteQuestionFromTest(
  teacher: User,
  testId: string,
  questionId: string
): Promise<{ ok: true } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" | "QUESTION_NOT_FOUND" | "PUBLISHED" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  if (test.publishedAt) return { error: "PUBLISHED" };
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q || q.testId !== testId) return { error: "QUESTION_NOT_FOUND" };
  await prisma.question.delete({ where: { id: questionId } });
  return { ok: true };
}

function generatePublicCode() {
  return randomBytes(3).toString("hex").toUpperCase();
}

export async function publishTest(
  teacher: User,
  testId: string
): Promise<{ ok: true; item: TestItem } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };

  const publicCode = test.publicCode ?? generatePublicCode();
  const publishedAt = test.publishedAt ?? new Date();

  const updated = await prisma.test.update({
    where: { id: testId },
    data: { publicCode, publishedAt },
  });

  return {
    ok: true,
    item: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      publicCode: updated.publicCode,
      publishedAt: updated.publishedAt?.getTime() ?? null,
      createdAt: updated.createdAt.getTime(),
    },
  };
}

export async function getPublishedTestByCode(
  code: string
): Promise<
  | {
      ok: true;
      test: { id: string; title: string; description?: string | null };
      questions: Array<{ id: string; text: string; options?: string[] | null }>;
    }
  | { error: "NOT_FOUND" }
> {
  const test = await prisma.test.findFirst({
    where: { publicCode: code, publishedAt: { not: null } },
  });
  if (!test) return { error: "NOT_FOUND" };
  const qs = await prisma.question.findMany({ where: { testId: test.id }, orderBy: { createdAt: "asc" } });
  const questions = qs.map(q => ({ id: q.id, text: q.text, options: (q.options as unknown as string[] | null) ?? null }));
  return { ok: true, test: { id: test.id, title: test.title, description: test.description }, questions };
}

export async function submitGuestAttempt(
  code: string,
  name: string,
  answers: Record<string, number | string | null>
): Promise<{ ok: true; score: number; total: number } | { error: "NOT_FOUND" | "NAME_REQUIRED" }> {
  const testRow = await prisma.test.findFirst({
    where: { publicCode: code, publishedAt: { not: null } },
  });
  if (!testRow) return { error: "NOT_FOUND" };
  const cleanName = normalizeName(name);
  if (!cleanName) return { error: "NAME_REQUIRED" };

  const qs = await prisma.question.findMany({ where: { testId: testRow.id } });
  let score = 0;
  let total = 0;
  const storedAnswers: Record<string, unknown> = {};
  for (const q of qs) {
    const opts = (q.options as unknown as string[] | null) ?? null;
    if (opts && typeof q.correctIndex === "number") {
      total += 1;
      const choice = answers[q.id];
      storedAnswers[q.id] = choice ?? null;
      if (typeof choice === "number" && choice === q.correctIndex) score += 1;
    }
  }

  await prisma.guestTestAttempt.create({
    data: {
      testId: testRow.id,
      name: cleanName,
      score,
      total,
      answers: storedAnswers,
    },
  });

  return { ok: true, score, total };
}

export async function listStudents(): Promise<Array<{ id: string; name: string }>> {
  const users = await prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: { name: "asc" } });
  return users.map(u => ({ id: u.id, name: u.name }));
}

export async function listStudentsForAdmin(): Promise<
  Array<{ id: string; name: string; username: string; createdAt: number; count: number }>
> {
  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    include: { _count: { select: { enrolls: true } } },
  });
  return users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    createdAt: u.createdAt.getTime(),
    count: u._count.enrolls ?? 0,
  }));
}

export async function listTeachersForAdmin(): Promise<
  Array<{ id: string; name: string; username: string; createdAt: number; count: number }>
> {
  const users = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
  return users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    createdAt: u.createdAt.getTime(),
    count: u._count.courses ?? 0,
  }));
}

export type WeeklyScoreRow = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  week: number;
  part: number;
  lectureScore: number;
  practiceScore: number;
  individualWorkScore: number;
  ratingScore?: number | null;
  midtermScore?: number | null;
  examScore?: number | null;
};

export async function listWeeklyScoresForStudent(studentId: string): Promise<WeeklyScoreRow[]> {
  const rows = await prisma.weeklyScore.findMany({
    where: { studentId },
    orderBy: [{ courseId: "asc" }, { week: "asc" }],
    include: { course: true },
  });

  return rows.map(r => ({
    courseId: r.courseId,
    courseCode: r.course.code,
    courseTitle: r.course.title,
    week: r.week,
    part: r.part,
    lectureScore: r.lectureScore,
    practiceScore: r.practiceScore,
    individualWorkScore: r.individualWorkScore,
    ratingScore: r.ratingScore,
    midtermScore: r.midtermScore,
    examScore: r.examScore,
  }));
}

export async function listCourseStudentsForTeacher(
  teacherId: string,
  courseId: string
): Promise<Array<{ id: string; name: string; username: string }>> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.teacherId !== teacherId) return [];
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  return enrollments
    .filter(e => e.user.role === "STUDENT")
    .map(e => ({ id: e.user.id, name: e.user.name, username: e.user.username }));
}

export async function setWeeklyScoreForTeacher(
  teacherId: string,
  payload: {
    courseId: string;
    studentId: string;
    week: number;
    part?: number | null;
    lectureScore?: number | null;
    practiceScore?: number | null;
    individualWorkScore?: number | null;
    ratingScore?: number | null;
    midtermScore?: number | null;
    examScore?: number | null;
  }
): Promise<{ ok: true } | { error: "FORBIDDEN" | "COURSE_NOT_FOUND" | "STUDENT_NOT_FOUND" | "NOT_ENROLLED" | "INVALID_WEEK" }> {
  if (teacherId === "") return { error: "FORBIDDEN" };
  const { courseId, studentId, week } = payload;
  if (!Number.isInteger(week) || week < 1 || week > 14) return { error: "INVALID_WEEK" };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "COURSE_NOT_FOUND" };
  if (course.teacherId !== teacherId) return { error: "FORBIDDEN" };

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") return { error: "STUDENT_NOT_FOUND" };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });
  if (!enrollment) return { error: "NOT_ENROLLED" };

  const clampScore = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value)));
  };

  await prisma.weeklyScore.upsert({
    where: { courseId_studentId_week: { courseId, studentId, week } },
    update: {
      part: payload.part ?? (week <= 7 ? 1 : 2),
      lectureScore: clampScore(payload.lectureScore) ?? 0,
      practiceScore: clampScore(payload.practiceScore) ?? 0,
      individualWorkScore: clampScore(payload.individualWorkScore) ?? 0,
      ratingScore: clampScore(payload.ratingScore),
      midtermScore: clampScore(payload.midtermScore),
      examScore: clampScore(payload.examScore),
    },
    create: {
      courseId,
      studentId,
      week,
      part: payload.part ?? (week <= 7 ? 1 : 2),
      lectureScore: clampScore(payload.lectureScore) ?? 0,
      practiceScore: clampScore(payload.practiceScore) ?? 0,
      individualWorkScore: clampScore(payload.individualWorkScore) ?? 0,
      ratingScore: clampScore(payload.ratingScore),
      midtermScore: clampScore(payload.midtermScore),
      examScore: clampScore(payload.examScore),
    },
  });

  return { ok: true };
}

export async function assignTestToStudent(
  teacher: User,
  data: { testId: string; studentId: string; dueAt?: string | null }
): Promise<{ ok: true; item: TestAssignmentItem } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" | "STUDENT_NOT_FOUND" | "INVALID_DUE" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: data.testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  const student = await prisma.user.findUnique({ where: { id: data.studentId } });
  if (!student || student.role !== "STUDENT") return { error: "STUDENT_NOT_FOUND" };
  let dueAt: Date | null = null;
  if (data.dueAt) {
    const d = new Date(data.dueAt);
    if (isNaN(d.getTime())) return { error: "INVALID_DUE" };
    dueAt = d;
  }
  const a = await prisma.testAssignment.create({
    data: { testId: test.id, studentId: student.id, assignedById: teacher.id, dueAt },
    include: { student: true },
  });
  return {
    ok: true,
    item: {
      id: a.id,
      testId: a.testId,
      student: { id: a.student.id, name: a.student.name },
      dueAt: a.dueAt?.getTime() ?? null,
      status: a.status,
      createdAt: a.createdAt.getTime(),
    },
  };
}

export async function listStudentStatusesForTest(
  teacher: User,
  testId: string
): Promise<{ ok: true; items: TestStudentStatus[] } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  const assignments = await prisma.testAssignment.findMany({
    where: { testId },
    orderBy: { createdAt: "asc" },
    include: { student: true },
  });
  const items: TestStudentStatus[] = assignments.map(a => ({
    id: a.student.id,
    name: a.student.name,
    status: a.status,
    timestamp: a.createdAt.getTime(),
  }));
  return { ok: true, items };
}

export async function listGuestAttemptsForTest(
  teacher: User,
  testId: string
): Promise<{ ok: true; items: GuestAttempt[] } | { error: "FORBIDDEN" | "TEST_NOT_FOUND" }> {
  if (teacher.role !== "TEACHER") return { error: "FORBIDDEN" };
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return { error: "TEST_NOT_FOUND" };
  if (test.teacherId !== teacher.id) return { error: "FORBIDDEN" };
  const attempts = await prisma.guestTestAttempt.findMany({
    where: { testId },
    orderBy: { createdAt: "desc" },
  });
  return {
    ok: true,
    items: attempts.map(a => ({
      id: a.id,
      name: a.name,
      score: a.score,
      total: a.total,
      createdAt: a.createdAt.getTime(),
    })),
  };
}

export async function getTeacherAnalytics(teacherId: string): Promise<TeacherAnalytics> {
  const now = Date.now();

  const [testsTotal, publishedTests, questionsTotal, assignments, guestAttempts, recentTests] = await Promise.all([
    prisma.test.count({ where: { teacherId } }),
    prisma.test.count({ where: { teacherId, publishedAt: { not: null } } }),
    prisma.question.count({ where: { test: { teacherId } } }),
    prisma.testAssignment.findMany({
      where: { test: { teacherId } },
      include: { student: { select: { id: true, name: true } } },
    }),
    prisma.guestTestAttempt.findMany({
      where: { test: { teacherId } },
      select: { score: true, total: true, testId: true },
    }),
    prisma.test.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { questions: true, assignments: true, guestAttempts: true } },
        assignments: { select: { status: true } },
        guestAttempts: { select: { score: true, total: true } },
      },
    }),
  ]);

  const status = { assigned: 0, inProgress: 0, completed: 0 };
  for (const a of assignments) {
    switch (a.status) {
      case "IN_PROGRESS":
        status.inProgress += 1;
        break;
      case "COMPLETED":
        status.completed += 1;
        break;
      default:
        status.assigned += 1;
    }
  }

  const assignmentsTotal = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED").length;
  const completionRate = assignmentsTotal > 0 ? completedAssignments / assignmentsTotal : 0;
  const uniqueStudents = new Set(assignments.map(a => a.studentId)).size;
  const upcomingDue = assignments.filter(a => a.dueAt && a.dueAt.getTime() > now && a.status !== "COMPLETED").length;

  let guestScoreSum = 0;
  let guestScoreTotal = 0;
  guestAttempts.forEach(a => {
    guestScoreSum += a.score;
    guestScoreTotal += a.total;
  });
  const avgGuestScore = guestScoreTotal > 0 ? guestScoreSum / guestScoreTotal : 0;

  const recentTestsView = recentTests.map(t => {
    const completed = t.assignments.filter(a => a.status === "COMPLETED").length;
    let localScore = 0;
    let localTotal = 0;
    t.guestAttempts.forEach(g => {
      localScore += g.score;
      localTotal += g.total;
    });
    return {
      id: t.id,
      title: t.title,
      createdAt: t.createdAt.getTime(),
      publishedAt: t.publishedAt?.getTime() ?? null,
      questions: t._count.questions ?? 0,
      assignments: t._count.assignments ?? 0,
      completedAssignments: completed,
      completionRate: t._count.assignments ? completed / t._count.assignments : 0,
      guestAttempts: t._count.guestAttempts ?? 0,
      avgGuestScore: localTotal > 0 ? localScore / localTotal : 0,
    };
  });

  const topStudentsMap = new Map<
    string,
    { id: string; name: string; totalAssignments: number; completedAssignments: number }
  >();
  for (const a of assignments) {
    const existing =
      topStudentsMap.get(a.studentId) ??
      {
        id: a.studentId,
        name: a.student?.name ?? "Студент",
        totalAssignments: 0,
        completedAssignments: 0,
      };
    existing.totalAssignments += 1;
    if (a.status === "COMPLETED") existing.completedAssignments += 1;
    topStudentsMap.set(a.studentId, existing);
  }
  const topStudents = Array.from(topStudentsMap.values())
    .sort((a, b) => {
      if (b.completedAssignments !== a.completedAssignments) return b.completedAssignments - a.completedAssignments;
      return b.totalAssignments - a.totalAssignments;
    })
    .slice(0, 5);

  return {
    summary: {
      testsTotal,
      publishedTests,
      questionsTotal,
      avgQuestionsPerTest: testsTotal > 0 ? questionsTotal / testsTotal : 0,
      assignmentsTotal,
      completedAssignments,
      completionRate,
      uniqueStudents,
      upcomingDue,
      guestAttemptsTotal: guestAttempts.length,
      avgGuestScore,
    },
    status,
    recentTests: recentTestsView,
    topStudents,
  };
}

export type StudentAssignment = {
  id: string;
  test: { id: string; title: string };
  dueAt?: number | null;
  status: string;
};

export async function listAssignmentsForStudent(studentId: string): Promise<StudentAssignment[]> {
  const rows = await prisma.testAssignment.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { test: true },
  });
  return rows.map(r => ({ id: r.id, test: { id: r.test.id, title: r.test.title }, dueAt: r.dueAt?.getTime() ?? null, status: r.status }));
}

export async function getAssignmentQuestionsForStudent(
  student: User,
  assignmentId: string
): Promise<{ ok: true; assignment: StudentAssignment; questions: Array<{ id: string; text: string; options?: string[] | null }> } | { error: "FORBIDDEN" | "ASSIGNMENT_NOT_FOUND" }> {
  if (student.role !== "STUDENT") return { error: "FORBIDDEN" };
  const a = await prisma.testAssignment.findUnique({ where: { id: assignmentId }, include: { test: true } });
  if (!a || a.studentId !== student.id) return { error: "ASSIGNMENT_NOT_FOUND" };
  const qs = await prisma.question.findMany({ where: { testId: a.testId }, orderBy: { createdAt: "asc" } });
  const questions = qs.map(q => ({ id: q.id, text: q.text, options: (q.options as unknown as string[] | null) ?? null }));
  const assignment: StudentAssignment = { id: a.id, test: { id: a.test.id, title: a.test.title }, dueAt: a.dueAt?.getTime() ?? null, status: a.status };
  return { ok: true, assignment, questions };
}

export async function submitAssignmentAnswers(
  student: User,
  assignmentId: string,
  answers: Record<string, number | string | null>
): Promise<{ ok: true; score: number; total: number } | { error: "FORBIDDEN" | "ASSIGNMENT_NOT_FOUND" | "ALREADY_SUBMITTED" }> {
  if (student.role !== "STUDENT") return { error: "FORBIDDEN" };
  const a = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
  if (!a || a.studentId !== student.id) return { error: "ASSIGNMENT_NOT_FOUND" };
  if (a.status === "COMPLETED") return { error: "ALREADY_SUBMITTED" };
  const qs = await prisma.question.findMany({ where: { testId: a.testId } });
  let score = 0;
  let total = 0;
  for (const q of qs) {
    const opts = (q.options as unknown as string[] | null) ?? null;
    if (opts && typeof q.correctIndex === "number") {
      total += 1;
      const chosen = answers[q.id];
      if (typeof chosen === "number" && chosen === q.correctIndex) score += 1;
    }
  }
  // Persist only status; storing detailed answers would require schema changes.
  await prisma.testAssignment.update({ where: { id: assignmentId }, data: { status: "COMPLETED" } });
  return { ok: true, score, total };
}
