import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начало сидирования...');

  // Хеширование пароля
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Создаём учителя
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@example.com',
      name: 'Иван Учитель',
      password: hashedPassword,
      role: 'TEACHER',
    },
  });

  // Создаём курс
  const course = await prisma.course.create({
    data: {
      title: 'Основы программирования',
      description: 'Курс для начинающих',
      teacherId: teacher.id,
    },
  });

  // Создаём уроки
  await prisma.lesson.createMany({
    data: [
      {
        title: 'Введение в Python',
        content: 'Что такое язык программирования и зачем он нужен.',
        courseId: course.id,
      },
      {
        title: 'Переменные и типы данных',
        content: 'Как хранить информацию в программах.',
        courseId: course.id,
      },
    ],
  });

  // Создаём студента
  const student = await prisma.user.create({
    data: {
      email: 'student@example.com',
      name: 'Алина Студентка',
      password: hashedPassword,
      role: 'STUDENT',
    },
  });

  // Подписка студента на курс
  await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: course.id,
    },
  });

  console.log('✅ Сиды успешно созданы!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
