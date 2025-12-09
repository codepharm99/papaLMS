/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function upsertUser({ id, username, name, role, password }) {
  const normalizedUsername = username.toLowerCase();
  return prisma.user.upsert({
    where: { username: normalizedUsername },
    update: { name, role, password },
    create: { id, username: normalizedUsername, name, role, password },
  });
}

async function upsertCourse({ id, code, title, orgTag, description, teacherId }) {
  return prisma.course.upsert({
    where: { id },
    update: { code, title, orgTag, description, teacherId },
    create: { id, code, title, orgTag, description, teacherId },
  });
}

async function upsertMaterial({ id, courseId, teacherId, title, description, url, createdAt }) {
  return prisma.material.upsert({
    where: { id },
    update: { title, description, url },
    create: { id, courseId, teacherId, title, description, url, createdAt },
  });
}

async function main() {
  console.log("🌱 Сидируем базу...");
  const passwordHash = await bcrypt.hash("1111", 10);

  const admin = await upsertUser({
    id: "u0",
    username: "admin1",
    name: "Администратор",
    role: Role.ADMIN,
    password: passwordHash,
  });

  const teacher = await upsertUser({
    id: "u2",
    username: "teacher1",
    name: "Преподаватель One",
    role: Role.TEACHER,
    password: passwordHash,
  });

  const student = await upsertUser({
    id: "u1",
    username: "student1",
    name: "Студент One",
    role: Role.STUDENT,
    password: passwordHash,
  });

  const courses = await Promise.all([
    upsertCourse({
      id: "c1",
      code: "CS101",
      title: "Введение в программирование",
      orgTag: "IUA",
      description: "Базовый курс по основам CS для первокурсников.",
      teacherId: teacher.id,
    }),
    upsertCourse({
      id: "c2",
      code: "ML201",
      title: "Машинное обучение",
      orgTag: "IUA",
      description: "Практикум по классическим алгоритмам ML.",
      teacherId: teacher.id,
    }),
    upsertCourse({
      id: "c3",
      code: "DB110",
      title: "Базы данных",
      orgTag: "IUA",
      description: "SQL, нормализация и проектирование.",
      teacherId: teacher.id,
    }),
  ]);
//  Create a map for easy access

  const courseMap = Object.fromEntries(courses.map(course => [course.id, course]));

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: courseMap.c2.id } },
    update: {},
    create: { id: "e1", userId: student.id, courseId: courseMap.c2.id },
  });

  const now = Date.now();
  await upsertMaterial({
    id: "m1",
    courseId: courseMap.c2.id,
    teacherId: teacher.id,
    title: "Силлабус курса ML201 (PDF)",
    url: "https://example.org/syllabus.pdf",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7),
  });
  await upsertMaterial({
    id: "m2",
    courseId: courseMap.c2.id,
    teacherId: teacher.id,
    title: "Лекция 1 — введение",
    description: "Слайды и краткие заметки",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 6),
  });

  await prisma.teacherInvite.upsert({
    where: { code: "TEACH-2025" },
    update: {},
    create: { id: "ti1", code: "TEACH-2025", createdById: admin.id },
  });

  console.log("✅ Сиды готовы");
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
