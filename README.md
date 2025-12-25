# papaLMS — LMS на Next.js 16 + Prisma (PostgreSQL)

Учебный проект LMS: каталог курсов → страница курса → материалы → тестирование. Стек: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind, Prisma (PostgreSQL). Роли: STUDENT / TEACHER / ADMIN. Авторизация через cookie. Поддержаны курсы, материалы, приглашения преподавателей и тестирование с публикацией публичной ссылки/QR и гостевыми попытками.

---

## ⚙️ Требования

- Node.js 18+
- npm/pnpm/bun
- PostgreSQL (обычный или Prisma Accelerate URL)

---

## 🚀 Быстрый старт

1) Переменные окружения:
```
cp .env .env.local   # если нужно
# Установите DATABASE_URL
```

2) Установите зависимости и синхронизируйте БД:
```
npm i
npx prisma db push --accept-data-loss   # синхронизирует схему, генерирует клиента
npm run seed                            # создаст тестовые данные (один раз)
```

3) Запуск dev-сервера:
```
npm run dev                             # теперь не пересоздаёт/не пересеивает БД на каждый запуск
# http://localhost:3000
```

Демо-логины после seed:
- student1 / 1111 — STUDENT
- teacher1 / 1111 — TEACHER
- admin1 / 1111 — ADMIN (выдаёт инвайты для регистрации преподавателей)

---

## 🧱 Технологии

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS 4
- Prisma ORM + PostgreSQL
- bcrypt для паролей

---

## 🤖 ИИ генерация презентаций (Ollama)

- В инструменте «Презентации» появилась кнопка «Сгенерировать слайды» — она запрашивает черновик у Ollama и заполняет редактор.
- Нужен доступ к серверу Ollama (по умолчанию `http://100.92.41.89:11434`) с моделью `ministral-3:3b`. При другом сервере/модели переопределите переменные окружения.
- Переменные окружения (сервер):
  - `OLLAMA_BASE_URL` — адрес сервера Ollama, например `http://10.0.0.5:11434` (по умолчанию `http://100.92.41.89:11434`).
  - `OLLAMA_MODEL` — модель для генерации, по умолчанию `gpt-oss:20b`.
  - `OLLAMA_TIMEOUT_MS` — таймаут запросов к Ollama в миллисекундах (по умолчанию `90000`). Альтернатива: `OLLAMA_TIMEOUT` в секундах.
  - `PEXELS_API_KEY` — ключ для подстановки картинок из Pexels (опционально).
- Промпт для черновика презентации: `prompts/presentation.md` (Markdown), обязателен. Можно указать свой путь через `PRESENTATION_PROMPT_PATH`. Плейсхолдеры `{{topic}}` и `{{slides}}`.
- Промпт для детализации слайда по кнопке «Сгенерировать подробности»: `prompts/presentation-detail.md` (Markdown). Путь можно переопределить `PRESENTATION_DETAIL_PROMPT_PATH`. Плейсхолдеры `{{topic}}`, `{{heading}}`, `{{rules}}`.
- Правила генерации текста вынесены отдельно: `prompts/presentation-text-rules.md` (можно поменять через `PRESENTATION_DETAIL_RULES_PATH`). Содержимое вставляется в `{{rules}}`; по умолчанию: текст на английском, без списков/нумерации, связный и по теме.
- В редакторе слайда есть кнопка «Сгенерировать подробности» — она заполняет поле текста для конкретного слайда, оставляя заголовок неизменным.
- При использовании Pexels в слайды подставляется атрибуция автора/ссылки, как рекомендует Pexels API. Возможен лимит по ключу (429). Поиск идёт по заголовку + теме презентации (результаты могут меняться).
- Сохранённые презентации хранятся на сервере и доступны только преподавателю, который их создал (`/api/teacher/presentations` GET/POST, DELETE `/api/teacher/presentations/:id`). После изменения схемы не забудьте применить миграцию Prisma.
- Ответ ИИ заменяет текущий черновик, его можно доработать вручную и добавить изображения перед показом студентам.

---

## 🗂️ Основные файлы и страницы

- `src/app/layout.tsx` — корневой layout, user-context
- `src/app/login/page.tsx` — вход/регистрация
- `src/app/catalog/page.tsx` — каталог курсов
- `src/app/course/[id]/page.tsx` — страница курса, вкладка материалов
- `src/components/Materials.tsx` — список/добавление материалов (для учителя курса)
- `src/app/teacher/tools/page.tsx` — инструментальная панель преподавателя
- **Тестирование (teacher)**:
  - `src/app/teacher/tests/page.tsx` — список прошлых тестов, создание нового
  - `src/app/teacher/tests/[id]/edit/page.tsx` — редактор: добавление вопросов, назначение студенту, публикация публичной ссылки и QR; после публикации вопросы менять нельзя
  - `src/app/teacher/tools/marks/page.tsx` — преподаватель выставляет баллы по неделям для студентов своих курсов
- **Тестирование (student)**:
  - `src/app/student/tests/page.tsx` — список назначенных тестов
  - `src/app/student/tests/[aid]/page.tsx` — сдача назначенного теста, сервер считает балл
  - `src/app/student/marks/page.tsx` — таблица оценок по неделям (лекции/практики/инд.работа/рейтинг/экзамен)
- **Гостевой тест по ссылке**:
  - `src/app/tests/[code]/page.tsx` — страница по публичному коду/QR: ввод имени, ответы, вывод результата; попытка сохраняется как гостевая с оценкой
- Админ:
  - `src/app/admin/invites/page.tsx` — инвайты для регистрации преподавателей
  - `src/app/admin/users/page.tsx` — просмотр списков преподавателей и студентов

API (основное):
- `/api/auth/login|register|me`
- `/api/courses`, `/api/courses/:id`, `/api/courses/:id/enroll`, `/api/courses/:id/materials`
- `/api/teacher/courses`, `/api/teacher/students`
- `/api/admin/teacher-invites`
- Тесты (teacher): `/api/teacher/tests`, `/api/teacher/tests/:id/questions`, `/api/teacher/tests/:id/publish`
- Тесты (student): `/api/student/tests`, `/api/student/tests/:aid`, `/api/student/tests/:aid/submit`
- Публичные тесты: `/api/tests/:code`, `/api/tests/:code/submit`

---

## 🗄️ Модель данных (prisma/schema.prisma)

- User (role: STUDENT/TEACHER/ADMIN)
- Course, Enrollment, Material
- TeacherInvite (код для регистрации преподавателя)
- Test: `publicCode?`, `publishedAt?`, вопросы, назначения, гостевые попытки
- Question: text, options?, correctIndex?
- TestAssignment: привязка теста к студенту
- GuestTestAttempt: имя гостя, score/total, ответы, createdAt

---

## 🔐 Роли и ключевые потоки

- STUDENT: записываться на курсы, видеть материалы, сдавать назначенные тесты
- TEACHER: создавать курсы, добавлять материалы, создавать тесты, публиковать их, выдавать публичную ссылку/QR, назначать тест студентам; после публикации теста вопросы изменить нельзя
- ADMIN: выдаёт инвайты для регистрации преподавателей
- Гости/студенты по ссылке `/tests/{code}`: вводят имя, проходят тест, получают балл; попытка сохраняется отдельно от пользователей

---

## ❗️ Замечания

- При изменении схемы создавайте миграцию `npx prisma migrate dev --name ...` и коммитьте её; `npm run db:deploy` применит её автоматически
- Для публикации теста: в редакторе нажмите «Опубликовать», используйте выданную ссылку/QR; с опубликованным тестом нельзя добавлять/редактировать/удалять вопросы
- Если dev-сервер ругается на lock-файл `.next/dev/lock`, остановите предыдущий `next dev`

---

## 📜 Скрипты

```
"dev": "npm run db:setup && next dev",
"build": "npm run db:deploy && next build",
"start": "npm run db:deploy && next start",
"lint": "eslint",
"seed": "node prisma/seed.cjs",
"db:deploy": "prisma migrate deploy",
"db:setup": "npm run db:deploy && npm run seed"
```

`npm run dev` теперь сам прогоняет миграции (`prisma migrate deploy`) и сиды перед запуском, чтобы удалённая БД была в актуальном состоянии.

Добавочные (по желанию):
```
"prisma:studio": "prisma studio",
"prisma:migrate": "prisma migrate dev"
```

---

## 🗺️ Краткий roadmap

- Доработка заданий/сдач, оценок, посещаемости
- Улучшение валидации/обработки ошибок
- Нотификации/тосты и улучшенные состояния загрузки
