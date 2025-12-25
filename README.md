# papaLMS — учебная LMS на Next.js 16 + Prisma

Учебный проект LMS с ролями STUDENT / TEACHER / ADMIN. Основной поток: каталог → запись на курс → материалы → тесты (назначенные и публичные) → оценки и аналитика. Проект использует Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS 4 и Prisma + PostgreSQL. Авторизация — через httpOnly cookie с id пользователя.

---

## Возможности

- Каталог курсов с поиском по названию/коду/тегу
- Запись/отписка студентов на курс
- Материалы курса (добавление преподавателем)
- Тесты: создание, вопросы, назначения студентам, публикация по ссылке/QR
- Публичные тесты для гостей (без аккаунта)
- Оценки по неделям (лекции/практика/инд.работа/рейтинг/экзамен)
- Профили пользователей
- Презентации преподавателя + генерация слайдов через Ollama
- Админ-инвайты для регистрации преподавателей

---

## Требования

- Node.js 18+
- npm (или pnpm/bun — по желанию)
- PostgreSQL
- Опционально: сервер Ollama и ключ Pexels (для генерации презентаций)

---

## Быстрый старт (локально)

1) Переменные окружения:

```bash
cp .env .env.local
# Обновите DATABASE_URL под свою БД
```

Минимально:

```env
DATABASE_URL="postgresql://USER@localhost:5432/lms"
```

2) Установка зависимостей:

```bash
npm i
```

3) Подготовка базы данных и сидов:

```bash
npm run db:setup
```

4) Запуск dev-сервера:

```bash
npm run dev
# http://localhost:3000
```

Важно:
- `npm run dev` запускает только Next.js. Миграции/сиды не выполняются автоматически.
- При изменении схемы используйте `npx prisma migrate dev --name ...` и затем `npm run seed`, если нужны новые демо-данные.

---

## Демо-логины после сидов

- `student1` / `1111` — STUDENT
- `teacher1` / `1111` — TEACHER
- `admin1` / `1111` — ADMIN (выдает инвайты преподавателям)

---

## Скрипты

```json
"dev": "next dev",
"build": "npm run db:deploy && next build",
"start": "npm run db:deploy && next start",
"lint": "eslint",
"seed": "node prisma/seed.cjs",
"db:deploy": "prisma migrate deploy",
"db:setup": "npm run db:deploy && npm run seed"
```

---

## Основные страницы и модули

- `src/app/page.tsx` — лендинг
- `src/app/login/page.tsx` — вход/регистрация
- `src/app/catalog/page.tsx` — каталог курсов
- `src/app/course/[id]/page.tsx` — страница курса и материалы
- `src/app/teacher/courses/page.tsx` — курсы преподавателя
- `src/app/teacher/tests/*` — тесты преподавателя, редактор и публикация
- `src/app/student/courses/page.tsx` — курсы студента
- `src/app/student/tests/*` — назначенные тесты студента
- `src/app/tests/[code]/page.tsx` — публичный тест по коду
- `src/app/teacher/tools/presentations/page.tsx` — редактор презентаций
- `src/app/admin/*` — админ панель (инвайты, пользователи)

Библиотеки/утилиты:
- `src/lib/auth.ts` — cookie-авторизация
- `src/lib/mockdb.ts` — слой доступа к БД (Prisma)
- `src/lib/ollama.ts` — конфиг для генерации через Ollama

---

## Роли и основные сценарии

**STUDENT**
- Просматривает каталог и записывается на курсы
- Получает материалы курса
- Сдает назначенные тесты
- Видит оценки по неделям

**TEACHER**
- Создает курсы и материалы
- Формирует тесты, назначает студентам
- Публикует тест для гостей по ссылке/QR
- Ведет оценки по неделям
- Создает презентации, может генерировать слайды

**ADMIN**
- Выдает инвайты для регистрации преподавателей
- Просматривает списки преподавателей/студентов

---

## API (основные группы)

Auth:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Courses:
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses/:id/enroll`
- `GET/POST /api/courses/:id/materials`

Student:
- `GET /api/student/tests`
- `GET /api/student/tests/:aid`
- `POST /api/student/tests/:aid/submit`
- `GET /api/student/weekly-scores`

Teacher:
- `GET/POST /api/teacher/courses`
- `GET /api/teacher/courses/:cid/students`
- `GET/POST /api/teacher/tests`
- `GET/POST /api/teacher/tests/:id/questions`
- `PUT/DELETE /api/teacher/tests/:id/questions/:qid`
- `POST /api/teacher/tests/:id/publish`
- `GET/POST /api/teacher/tests/:id/assignments`
- `GET/POST /api/teacher/assignments`
- `GET/PUT /api/teacher/assignments/:aid`
- `POST /api/teacher/assignments/:aid/feedback`
- `GET/POST /api/teacher/weekly-scores`
- `GET /api/teacher/analytics`
- `GET /api/teacher/analytics/student`
- Презентации: `GET/POST /api/teacher/presentations`, `DELETE /api/teacher/presentations/:id`, `POST /api/teacher/presentations/generate`, `POST /api/teacher/presentations/expand`

Admin:
- `GET/POST /api/admin/teacher-invites`
- `GET /api/admin/teachers`
- `GET /api/admin/students`

Public tests:
- `GET /api/tests/:code`
- `POST /api/tests/:code/submit`

Дополнительно (служебные/черновые):
- `/api/attendance`, `/api/grades`, `/api/assignments`, `/api/submissions`, `/api/announcements`, `/api/sessions`

---

## ИИ-презентации (Ollama)

Генератор слайдов доступен в инструменте преподавателя. Он формирует черновик презентации и может добавлять изображения из Pexels.

Переменные окружения:
- `OLLAMA_BASE_URL` — адрес сервера Ollama (по умолчанию `http://100.92.41.89:11434`)
- `OLLAMA_MODEL` — модель (по умолчанию `gemma3:12b`)
- `OLLAMA_TIMEOUT_MS` — таймаут запроса в миллисекундах (по умолчанию `90000`)
- `OLLAMA_TIMEOUT` — альтернативный таймаут в секундах
- `PEXELS_API_KEY` — ключ для поиска изображений (опционально)

Промпты:
- `prompts/presentation.md` — основной шаблон (можно переопределить `PRESENTATION_PROMPT_PATH`)
- `prompts/presentation-detail.md` — детализация слайда (через `PRESENTATION_DETAIL_PROMPT_PATH`)
- `prompts/presentation-text-rules.md` — правила текста (через `PRESENTATION_DETAIL_RULES_PATH`)

---

## Модель данных (кратко)

- `User` — роль, логин, имя
- `Profile` — профиль пользователя
- `Course` — курс, преподаватель
- `Enrollment` — запись студента на курс
- `Material` — материалы курса
- `WeeklyScore` — оценки по неделям
- `TeacherInvite` — инвайт-код для регистрации преподавателя
- `Test` / `Question` — тесты и вопросы
- `TestAssignment` — назначение теста студенту
- `GuestTestAttempt` — попытка гостя по публичной ссылке
- `Presentation` — презентации преподавателя

---

## Заметки по разработке

- Авторизация: httpOnly cookie `token` (id пользователя), хранится на сервере.
- `src/lib/mockdb.ts` — слой доступа к Prisma (историческое название).
- После публикации теста редактирование вопросов запрещено.

---

## Troubleshooting

- Ошибка Prisma `P2002` (уникальность) — проверьте сиды/уникальные поля.
- Тестовые данные не появляются — выполните `npm run seed`.
- Конфликт dev-lock — завершите предыдущий `next dev`.

---

## Roadmap (наброски)

- Улучшение UX/валидации форм
- Нотификации и статусы загрузки
- Расширение аналитики и отчетов
