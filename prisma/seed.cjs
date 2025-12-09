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
  const studentTwo = await upsertUser({
    id: "u3",
    username: "student2",
    name: "Студент Two",
    role: Role.STUDENT,
    password: passwordHash,
  });
  const studentThree = await upsertUser({
    id: "u4",
    username: "student3",
    name: "Студент Three",
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

  // display courses map for easy access

  const courseMap = Object.fromEntries(courses.map(course => [course.id, course]));

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: courseMap.c2.id } },
    update: {},
    create: { id: "e1", userId: student.id, courseId: courseMap.c2.id },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: studentTwo.id, courseId: courseMap.c1.id } },
    update: {},
    create: { id: "e2", userId: studentTwo.id, courseId: courseMap.c1.id },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: studentThree.id, courseId: courseMap.c2.id } },
    update: {},
    create: { id: "e3", userId: studentThree.id, courseId: courseMap.c2.id },
  });

  // Seed materials for ML201 course
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

  // Тесты и попытки для демонстрации аналитики преподавателя
  const mlQuiz = await prisma.test.upsert({
    where: { id: "t1" },
    update: {
      title: "ML201: Базовая проверка",
      description: "5 вопросов по первой неделе.",
      publicCode: "ML-OPEN-2025",
      publishedAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
      teacherId: teacher.id,
    },
    create: {
      id: "t1",
      teacherId: teacher.id,
      title: "ML201: Базовая проверка",
      description: "5 вопросов по первой неделе.",
      publicCode: "ML-OPEN-2025",
      publishedAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4),
    },
  });

  const dbQuiz = await prisma.test.upsert({
    where: { id: "t2" },
    update: {
      title: "DB110: Мини-квиз по индексам",
      description: "Подготовка к семинару по оптимизации запросов.",
      teacherId: teacher.id,
      publicCode: null,
      publishedAt: null,
    },
    create: {
      id: "t2",
      teacherId: teacher.id,
      title: "DB110: Мини-квиз по индексам",
      description: "Подготовка к семинару по оптимизации запросов.",
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
    },
  });

  const introQuiz = await prisma.test.upsert({
    where: { id: "t3" },
    update: {
      title: "CS101: Вводный тест",
      description: "Проверка терминов перед стартом курса.",
      publicCode: "CS-INTRO-QR",
      publishedAt: new Date(now - 1000 * 60 * 60 * 12),
      teacherId: teacher.id,
    },
    create: {
      id: "t3",
      teacherId: teacher.id,
      title: "CS101: Вводный тест",
      description: "Проверка терминов перед стартом курса.",
      publicCode: "CS-INTRO-QR",
      publishedAt: new Date(now - 1000 * 60 * 60 * 12),
      createdAt: new Date(now - 1000 * 60 * 60 * 18),
    },
  });

  await prisma.question.upsert({
    where: { id: "q1" },
    update: {
      testId: mlQuiz.id,
      text: "Что сильнее всего указывает на переобучение модели?",
      options: ["Высокий скор на тесте", "Сильный разрыв между train и val", "Мало признаков"],
      correctIndex: 1,
    },
    create: {
      id: "q1",
      testId: mlQuiz.id,
      text: "Что сильнее всего указывает на переобучение модели?",
      options: ["Высокий скор на тесте", "Сильный разрыв между train и val", "Мало признаков"],
      correctIndex: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
    },
  });

  await prisma.question.upsert({
    where: { id: "q2" },
    update: {
      testId: mlQuiz.id,
      text: "Какой оптимизатор чаще всего выбирают для небольших нейросетей?",
      options: ["SGD", "Adam", "Adagrad"],
      correctIndex: 1,
    },
    create: {
      id: "q2",
      testId: mlQuiz.id,
      text: "Какой оптимизатор чаще всего выбирают для небольших нейросетей?",
      options: ["SGD", "Adam", "Adagrad"],
      correctIndex: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3 + 1000),
    },
  });

  await prisma.question.upsert({
    where: { id: "q3" },
    update: {
      testId: mlQuiz.id,
      text: "Какой метрикой удобно смотреть на качество бинарной классификации?",
      options: ["MAE", "ROC-AUC", "MSE"],
      correctIndex: 1,
    },
    create: {
      id: "q3",
      testId: mlQuiz.id,
      text: "Какой метрикой удобно смотреть на качество бинарной классификации?",
      options: ["MAE", "ROC-AUC", "MSE"],
      correctIndex: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
    },
  });

  await prisma.question.upsert({
    where: { id: "q4" },
    update: {
      testId: dbQuiz.id,
      text: "Зачем нужен индекс в базе данных?",
      options: ["Ускоряет поиск", "Хранит бэкапы", "Шифрует таблицу"],
      correctIndex: 0,
    },
    create: {
      id: "q4",
      testId: dbQuiz.id,
      text: "Зачем нужен индекс в базе данных?",
      options: ["Ускоряет поиск", "Хранит бэкапы", "Шифрует таблицу"],
      correctIndex: 0,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
    },
  });

  await prisma.question.upsert({
    where: { id: "q5" },
    update: {
      testId: dbQuiz.id,
      text: "Как посмотреть план выполнения запроса?",
      options: ["DESCRIBE TABLE", "EXPLAIN", "VACUUM ANALYZE"],
      correctIndex: 1,
    },
    create: {
      id: "q5",
      testId: dbQuiz.id,
      text: "Как посмотреть план выполнения запроса?",
      options: ["DESCRIBE TABLE", "EXPLAIN", "VACUUM ANALYZE"],
      correctIndex: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2 + 1000),
    },
  });

  await prisma.question.upsert({
    where: { id: "q6" },
    update: {
      testId: introQuiz.id,
      text: "Какая конструкция отвечает за цикл в JavaScript?",
      options: ["if", "for", "switch"],
      correctIndex: 1,
    },
    create: {
      id: "q6",
      testId: introQuiz.id,
      text: "Какая конструкция отвечает за цикл в JavaScript?",
      options: ["if", "for", "switch"],
      correctIndex: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 12),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a1" },
    update: {
      testId: mlQuiz.id,
      studentId: student.id,
      assignedById: teacher.id,
      status: "COMPLETED",
      dueAt: new Date(now - 1000 * 60 * 60 * 24),
    },
    create: {
      id: "a1",
      testId: mlQuiz.id,
      studentId: student.id,
      assignedById: teacher.id,
      status: "COMPLETED",
      dueAt: new Date(now - 1000 * 60 * 60 * 24),
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a2" },
    update: {
      testId: mlQuiz.id,
      studentId: studentTwo.id,
      assignedById: teacher.id,
      status: "IN_PROGRESS",
      dueAt: new Date(now + 1000 * 60 * 60 * 48),
    },
    create: {
      id: "a2",
      testId: mlQuiz.id,
      studentId: studentTwo.id,
      assignedById: teacher.id,
      status: "IN_PROGRESS",
      dueAt: new Date(now + 1000 * 60 * 60 * 48),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a3" },
    update: {
      testId: mlQuiz.id,
      studentId: studentThree.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 72),
    },
    create: {
      id: "a3",
      testId: mlQuiz.id,
      studentId: studentThree.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 72),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a4" },
    update: {
      testId: dbQuiz.id,
      studentId: studentTwo.id,
      assignedById: teacher.id,
      status: "COMPLETED",
      dueAt: new Date(now - 1000 * 60 * 60 * 6),
    },
    create: {
      id: "a4",
      testId: dbQuiz.id,
      studentId: studentTwo.id,
      assignedById: teacher.id,
      status: "COMPLETED",
      dueAt: new Date(now - 1000 * 60 * 60 * 6),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a5" },
    update: {
      testId: dbQuiz.id,
      studentId: student.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 24 * 4),
    },
    create: {
      id: "a5",
      testId: dbQuiz.id,
      studentId: student.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 24 * 4),
    },
  });

  await prisma.testAssignment.upsert({
    where: { id: "a6" },
    update: {
      testId: introQuiz.id,
      studentId: studentThree.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 24),
    },
    create: {
      id: "a6",
      testId: introQuiz.id,
      studentId: studentThree.id,
      assignedById: teacher.id,
      status: "ASSIGNED",
      dueAt: new Date(now + 1000 * 60 * 60 * 24),
    },
  });

  await prisma.guestTestAttempt.upsert({
    where: { id: "g1" },
    update: { testId: mlQuiz.id, name: "Марина", score: 4, total: 5 },
    create: {
      id: "g1",
      testId: mlQuiz.id,
      name: "Марина",
      score: 4,
      total: 5,
      createdAt: new Date(now - 1000 * 60 * 60 * 2),
    },
  });

  await prisma.guestTestAttempt.upsert({
    where: { id: "g2" },
    update: { testId: mlQuiz.id, name: "Данил", score: 3, total: 5 },
    create: {
      id: "g2",
      testId: mlQuiz.id,
      name: "Данил",
      score: 3,
      total: 5,
      createdAt: new Date(now - 1000 * 60 * 60 * 1),
    },
  });

  await prisma.guestTestAttempt.upsert({
    where: { id: "g3" },
    update: { testId: introQuiz.id, name: "Аноним", score: 2, total: 3 },
    create: {
      id: "g3",
      testId: introQuiz.id,
      name: "Аноним",
      score: 2,
      total: 3,
      createdAt: new Date(now - 1000 * 60 * 30),
    },
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
