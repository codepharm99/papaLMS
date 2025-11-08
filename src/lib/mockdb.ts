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
