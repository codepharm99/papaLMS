export type ScoreEntry = {
  id: string;
  student: string;
  course: string;
  assignment: string;
  grade: number;
  maxGrade: number;
  updatedAt: number;
  trend: "up" | "down" | "steady";
};

type Params = { count?: number; seed?: number };

const defaultStudents = [
  "Анна Петрова",
  "Иван Ким",
  "Мария Соколова",
  "Дмитрий Орлов",
  "Сергей Лебедев",
  "Алия Ахметова",
  "Екатерина Романова",
  "Федор Гордеев",
  "Лидия Тарасова",
  "Влад Савчук",
];

const defaultCourses = [
  { code: "CS101", title: "Введение в программирование" },
  { code: "ML201", title: "Машинное обучение" },
  { code: "DB110", title: "Базы данных" },
  { code: "UX150", title: "UX-исследования" },
];

const defaultAssignments = [
  "Домашнее задание 1",
  "Домашнее задание 2",
  "Проект",
  "Контрольная",
  "Лабораторная работа",
  "Квиз",
];

function createRng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = <T,>(items: T[], rand: () => number) => items[Math.floor(rand() * items.length)];

export function generateScores(params: Params = {}): ScoreEntry[] {
  const { count = 24, seed = 42 } = params;
  const rand = createRng(seed);

  const entries: ScoreEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const student = pick(defaultStudents, rand);
    const course = pick(defaultCourses, rand);
    const assignment = pick(defaultAssignments, rand);
    const maxGrade = 100;
    const gradeBase = 65 + Math.round(rand() * 30);
    const noise = Math.round(rand() * 5) * (rand() > 0.5 ? 1 : -1);
    const grade = Math.max(50, Math.min(maxGrade, gradeBase + noise));
    const trend: ScoreEntry["trend"] =
      grade >= 85 ? "up" : grade <= 60 ? "down" : "steady";

    entries.push({
      id: `g-${i + 1}`,
      student,
      course: `${course.code} · ${course.title}`,
      assignment,
      grade,
      maxGrade,
      updatedAt: now - Math.floor(rand() * 1000 * 60 * 60 * 24 * 14),
      trend,
    });
  }

  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}
