// Простая "база" в памяти. Живёт в процессе Node, перезатирается при перезапуске dev.

export type Role = "STUDENT" | "TEACHER";

export type User = {
  id: string;
  username: string;
  password: string; // только для моков
  name: string;
  role: Role;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  teacherId: string;
  students: Set<string>; // userIds
};

const users: User[] = [
  { id: "u1", username: "student1", password: "1111", name: "Студент One", role: "STUDENT" },
  { id: "u2", username: "teacher1", password: "1111", name: "Преподаватель One", role: "TEACHER" },
];

const courses: Course[] = [
  { id: "c1", code: "CS101", title: "Введение в программирование", orgTag: "IUA", teacherId: "u2", students: new Set() },
  { id: "c2", code: "ML201", title: "Машинное обучение", orgTag: "IUA", teacherId: "u2", students: new Set(["u1"]) },
  { id: "c3", code: "DB110", title: "Базы данных", orgTag: "IUA", teacherId: "u2", students: new Set() },
];

export function findUserByCreds(username: string, password: string): User | null {
  return users.find(u => u.username === username && u.password === password) ?? null;
}

export function getUserById(id?: string | null): User | null {
  if (!id) return null;
  return users.find(u => u.id === id) ?? null;
}

export function listCourses(params: { me?: User | null; q?: string; mine?: boolean }) {
  const { me, q, mine } = params;
  const norm = (s: string) => s.toLowerCase().trim();

  let arr = courses.slice();
  if (q && q.trim()) {
    const nq = norm(q);
    arr = arr.filter(c =>
      norm(c.title).includes(nq) || norm(c.code).includes(nq) || norm(c.orgTag).includes(nq)
    );
  }
  if (mine && me) {
    arr = arr.filter(c => c.students.has(me.id));
  }

  return arr.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    orgTag: c.orgTag,
    teacherId: c.teacherId,
    enrolledCount: c.students.size,
    isEnrolled: !!me && c.students.has(me.id),
  }));
}

export function toggleEnroll(courseId: string, user: User) {
  const c = courses.find(x => x.id === courseId);
  if (!c) return null;
  if (c.students.has(user.id)) c.students.delete(user.id);
  else c.students.add(user.id);

  return {
    id: c.id,
    code: c.code,
    title: c.title,
    orgTag: c.orgTag,
    teacherId: c.teacherId,
    enrolledCount: c.students.size,
    isEnrolled: c.students.has(user.id),
  };
}

/* ===== Materials & Course details (mocks) ===== */

export type Material = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  url?: string;
  createdAt: number;
};

let __mid = 1;
const materials: Material[] = [
  {
    id: `m${__mid++}`,
    courseId: "c2",
    title: "Силлабус курса ML201 (PDF)",
    url: "https://example.org/syllabus.pdf",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: `m${__mid++}`,
    courseId: "c2",
    title: "Лекция 1 — введение",
    description: "Слайды и краткие заметки",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
];

export function getCourseView(courseId: string, me: User | null) {
  const c = courses.find(x => x.id === courseId);
  if (!c) return null;
  const teacher = getUserById(c.teacherId);
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    orgTag: c.orgTag,
    teacherId: c.teacherId,
    teacherName: teacher?.name ?? "Преподаватель",
    enrolledCount: c.students.size,
    isEnrolled: !!me && c.students.has(me.id),
  };
}

export function listMaterials(courseId: string) {
  return materials
    .filter(m => m.courseId === courseId)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addMaterial(
  courseId: string,
  props: { title: string; description?: string; url?: string },
  me: User
) {
  // Только преподаватель курса может добавлять материалы
  const c = courses.find(x => x.id === courseId);
  if (!c) return { error: "COURSE_NOT_FOUND" as const } as const;
  if (c.teacherId !== me.id) return { error: "FORBIDDEN" as const } as const;

  const item: Material = {
    id: `m${__mid++}`,
    courseId,
    title: String(props.title ?? "").trim(),
    description: props.description?.trim(),
    url: props.url?.trim(),
    createdAt: Date.now(),
  };
  if (!item.title) return { error: "TITLE_REQUIRED" as const } as const;

  materials.unshift(item);
  return { ok: true as const, item };
}