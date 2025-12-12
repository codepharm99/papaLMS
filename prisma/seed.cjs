/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function upsertUser({ id, username, name, role, password, email }) {
  const normalizedUsername = username.toLowerCase();
  return prisma.user.upsert({
    where: { username: normalizedUsername },
    update: { name, role, password, email },
    create: { id, username: normalizedUsername, name, role, password, email },
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

async function upsertProfile({ userId, fullName, bio, avatarUrl, email }) {
  return prisma.profile.upsert({
    where: { userId },
    update: { fullName, bio, avatarUrl, email },
    create: { userId, fullName, bio, avatarUrl, email },
  });
}

async function main() {
  console.log("🌱 Сидируем базу...");
  const passwordHash = await bcrypt.hash("1111", 10);
  const clampScore = value => Math.max(50, Math.min(100, Math.round(value)));

  const admin = await upsertUser({
    id: "u0",
    username: "admin1",
    name: "Администратор",
    role: Role.ADMIN,
    password: passwordHash,
    email: "admin1@example.org",
  });

  const teacher = await upsertUser({
    id: "u2",
    username: "teacher1",
    name: "Преподаватель One",
    role: Role.TEACHER,
    password: passwordHash,
    email: "teacher1@example.org",
  });
  const extraTeachers = [
    { id: "t1", username: "aigerim.tleu", name: "Айгерим Тлеухан" },
    { id: "t2", username: "askhat.seit", name: "Асхат Сейтказын" },
    { id: "t3", username: "bauyrzhan.n", name: "Бауыржан Нурлан" },
    { id: "t4", username: "dana.yermek", name: "Дана Ермек" },
    { id: "t5", username: "ermek.zhan", name: "Ермек Жанибек" },
    { id: "t6", username: "zhanel.kua", name: "Жанель Куаныш" },
    { id: "t7", username: "kamshat.alp", name: "Камшат Алпыс" },
    { id: "t8", username: "lyazzat.sag", name: "Ляззат Сагындык" },
    { id: "t9", username: "madina.oraz", name: "Мадина Ораз" },
    { id: "t10", username: "nurlan.kuat", name: "Нурлан Куат" },
    { id: "t11", username: "olzhas.ser", name: "Олжас Серик" },
    { id: "t12", username: "perizat.abl", name: "Перизат Абылай" },
    { id: "t13", username: "rustem.bal", name: "Рустем Балта" },
    { id: "t14", username: "sayana.aman", name: "Саяна Аман" },
    { id: "t15", username: "timur.dar", name: "Тимур Дархан" },
    { id: "t16", username: "ulan.ertai", name: "Улан Ертай" },
    { id: "t17", username: "fariza.nag", name: "Фариза Нагашы" },
    { id: "t18", username: "khadisha.sam", name: "Хадиша Самат" },
    { id: "t19", username: "chingiz.as", name: "Чингиз Асылбек" },
    { id: "t20", username: "sholpan.kar", name: "Шолпан Карлыгаш" },
  ];
  await Promise.all(
    extraTeachers.map(t =>
      upsertUser({
        ...t,
        role: Role.TEACHER,
        password: passwordHash,
      })
    )
  );

  const student = await upsertUser({
    id: "u1",
    username: "student1",
    name: "Студент One",
    role: Role.STUDENT,
    password: passwordHash,
    email: "student1@example.org",
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
  const extraStudents = [
    { id: "s01", username: "aidana.nur", name: "Айдана Нургазы" },
    { id: "s02", username: "alikhan.ser", name: "Алихан Серик" },
    { id: "s03", username: "amal.bek", name: "Амаль Бекжан" },
    { id: "s04", username: "ansar.kyd", name: "Ансар Кыдыр" },
    { id: "s05", username: "aruzhan.sag", name: "Аружан Сагындык" },
    { id: "s06", username: "askar.tur", name: "Аскар Турган" },
    { id: "s07", username: "azamat.kair", name: "Азамат Каирбек" },
    { id: "s08", username: "bauyrzhan.ali", name: "Бауыржан Али" },
    { id: "s09", username: "dana.ulat", name: "Дана Улат" },
    { id: "s10", username: "darina.syr", name: "Дарина Сырым" },
    { id: "s11", username: "daryn.myr", name: "Дарын Мырза" },
    { id: "s12", username: "dias.akt", name: "Диас Актай" },
    { id: "s13", username: "dinara.sam", name: "Динара Самал" },
    { id: "s14", username: "erbolat.syd", name: "Ерболат Сыдык" },
    { id: "s15", username: "erkezhan.ash", name: "Еркежан Ашир" },
    { id: "s16", username: "erzhan.kul", name: "Ержан Кулман" },
    { id: "s17", username: "inkar.tol", name: "Инкар Толеген" },
    { id: "s18", username: "karina.bol", name: "Карина Болат" },
    { id: "s19", username: "karlen.sag", name: "Карлен Сагид" },
    { id: "s20", username: "madina.naz", name: "Мадина Назир" },
    { id: "s21", username: "meirzhan.aba", name: "Мейржан Абаев" },
    { id: "s22", username: "merey.zhu", name: "Мерей Жумабек" },
    { id: "s23", username: "meruert.tay", name: "Меруерт Тайгуль" },
    { id: "s24", username: "nurgul.ras", name: "Нургуль Расул" },
    { id: "s25", username: "nurlan.askar", name: "Нурлан Аскар" },
    { id: "s26", username: "nurlybek.sh", name: "Нурлыбек Шарип" },
    { id: "s27", username: "ruslan.esk", name: "Руслан Ескен" },
    { id: "s28", username: "sabina.bek", name: "Сабина Бекжан" },
    { id: "s29", username: "sagyn.kuda", name: "Сагын Кудайбер" },
    { id: "s30", username: "samal.tole", name: "Самал Толеш" },
    { id: "s31", username: "sandugash.d", name: "Сандугаш Дастан" },
    { id: "s32", username: "serik.bai", name: "Серик Байжигит" },
    { id: "s33", username: "shinar.alu", name: "Шинар Алуа" },
    { id: "s34", username: "shyngys.ars", name: "Шынгыс Арсен" },
    { id: "s35", username: "tomiris.alt", name: "Томирис Алтын" },
    { id: "s36", username: "ulzhan.kar", name: "Улжан Каракоз" },
    { id: "s37", username: "yasina.kos", name: "Ясина Косан" },
    { id: "s38", username: "yerkebulan.t", name: "Еркебулан Тлеу" },
    { id: "s39", username: "zhanar.ulan", name: "Жанар Улан" },
    { id: "s40", username: "zhandos.muk", name: "Жандос Мукан" },
    { id: "s41", username: "zhasulan.ken", name: "Жасулан Кенжебек" },
    { id: "s42", username: "zhibek.nur", name: "Жибек Нуртай" },
    { id: "s43", username: "zina.askar", name: "Зина Аскар" },
    { id: "s44", username: "aidos.madi", name: "Айдос Мади" },
    { id: "s45", username: "aliya.kal", name: "Алия Калел" },
    { id: "s46", username: "anel.riza", name: "Анель Ризабек" },
    { id: "s47", username: "batyr.kair", name: "Батыр Каир" },
    { id: "s48", username: "dilnaz.erta", name: "Дильназ Ертаевна" },
    { id: "s49", username: "kamila.bor", name: "Камила Борис" },
    { id: "s50", username: "lazzat.ser", name: "Ляззат Серикбай" },
  ];
  await Promise.all(
    extraStudents.map(s =>
      upsertUser({
        ...s,
        role: Role.STUDENT,
        password: passwordHash,
      })
    )
  );

  // Ensure profiles exist for seeded users
  await upsertProfile({ userId: admin.id, fullName: admin.name, bio: "Администратор платформы", email: admin.email });
  await upsertProfile({ userId: teacher.id, fullName: teacher.name, bio: "Преподаватель курса", email: teacher.email });
  await upsertProfile({ userId: student.id, fullName: student.name, bio: "Студент курса", email: student.email });

  const courses = await Promise.all([
  const baseCourses = await Promise.all([
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

  const groupCoursesData = [
    { id: "c4", code: "P21-57K-PROG", title: "P21-57K: Основы программирования", orgTag: "P21-57K", description: "Группа p21-57k — базовый курс", teacherId: extraTeachers[0].id },
    { id: "c5", code: "P21-57K-ALGO", title: "P21-57K: Алгоритмы и структуры данных", orgTag: "P21-57K", description: "Ключевые алгоритмы и структуры", teacherId: extraTeachers[1].id },
    { id: "c6", code: "P21-57K-DB", title: "P21-57K: Базы данных", orgTag: "P21-57K", description: "SQL и моделирование данных", teacherId: extraTeachers[2].id },
    { id: "c7", code: "P21-57K-WEB", title: "P21-57K: Веб-разработка", orgTag: "P21-57K", description: "Frontend и базовый backend", teacherId: extraTeachers[3].id },
    { id: "c8", code: "P21-57K-ML", title: "P21-57K: Машинное обучение", orgTag: "P21-57K", description: "Введение в ML для группы p21-57k", teacherId: extraTeachers[4].id },
    { id: "c9", code: "P21-57K-DEVOPS", title: "P21-57K: DevOps основы", orgTag: "P21-57K", description: "CI/CD, контейнеры, мониторинг", teacherId: extraTeachers[5].id },
    { id: "c10", code: "P21-57K-SE", title: "P21-57K: Инжиниринг ПО", orgTag: "P21-57K", description: "Паттерны, тестирование, процессы", teacherId: extraTeachers[6].id },
    { id: "c11", code: "P21-57K-DATA", title: "P21-57K: Анализ данных", orgTag: "P21-57K", description: "EDA, визуализация, pandas", teacherId: extraTeachers[7].id },
    { id: "c12", code: "P21-57K-SEC", title: "P21-57K: Безопасность", orgTag: "P21-57K", description: "Основы информационной безопасности", teacherId: extraTeachers[8].id },
    { id: "c13", code: "P21-57K-PROJ", title: "P21-57K: Командный проект", orgTag: "P21-57K", description: "Проектная работа всей группы", teacherId: extraTeachers[9].id },
  ];

  const groupCourses = await Promise.all(groupCoursesData.map(course => upsertCourse(course)));
  const courses = [...baseCourses, ...groupCourses];

  // display courses map for easy access

  const courseMap = Object.fromEntries(courses.map(course => [course.id, course]));

  // Clean up teachers without courses (keeps main teacher + P21-57K course teachers)
  const usedTeacherIds = Array.from(new Set([teacher.id, ...groupCoursesData.map(c => c.teacherId)]));
  await prisma.user.deleteMany({
    where: { role: Role.TEACHER, id: { notIn: usedTeacherIds }, courses: { none: {} } },
  });

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

  const p21GroupStudentIds = extraStudents.map(s => s.id);
  for (const course of groupCourses) {
    for (const studentId of p21GroupStudentIds) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: studentId, courseId: course.id } },
        update: {},
        create: { id: `${course.id}-${studentId}`, userId: studentId, courseId: course.id },
      });
    }
  }

  // Week-by-week scores for group P21-57K across 14 weeks (lecture, practice, individual work)
  // Includes midterm on week 7 (ratingScore + midtermScore) and final exam on week 14.
  const weeklyRecords = [];
  groupCourses.forEach((course, courseIdx) => {
    p21GroupStudentIds.forEach((studentId, studentIdx) => {
      let cumulativeAvg = 0;
      for (let week = 1; week <= 14; week += 1) {
        const part = week <= 7 ? 1 : 2;
        const lectureScore = clampScore(60 + ((studentIdx * 3 + week * 2 + courseIdx) % 35));
        const practiceScore = clampScore(58 + ((studentIdx * 5 + week * 3 + courseIdx * 2) % 36));
        const individualWorkScore = clampScore(55 + ((studentIdx * 7 + week * 4 + courseIdx * 3) % 40));
        const weeklyAvg = (lectureScore + practiceScore + individualWorkScore) / 3;
        cumulativeAvg += weeklyAvg;

        const isMidtermWeek = week === 7;
        const isExamWeek = week === 14;
        const ratingScore = isMidtermWeek || isExamWeek ? clampScore(cumulativeAvg / week) : null;
        const midtermScore = isMidtermWeek ? clampScore(weeklyAvg + 5) : null;
        const examScore = isExamWeek ? clampScore((weeklyAvg + ratingScore + 10) / 2) : null;

        weeklyRecords.push({
          id: `${course.id}-${studentId}-w${week}`,
          studentId,
          courseId: course.id,
          week,
          part,
          lectureScore,
          practiceScore,
          individualWorkScore,
          ratingScore: ratingScore ?? undefined,
          midtermScore: midtermScore ?? undefined,
          examScore: examScore ?? undefined,
        });
      }
    });
  });

  if (weeklyRecords.length > 0) {
    await prisma.weeklyScore.createMany({ data: weeklyRecords, skipDuplicates: true });
  }

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
