export type Score = {
  subject: string;
  score: number;
};

const SUBJECTS = ["math", "english", "history", "science", "it"];
export function generateScores(name: string): Score[] {
  let seed = 0;

  for (let i = 0; i < name.length; i++) {
    seed = (seed * 31 + name.charCodeAt(i)) % 1000000;
  }

  return SUBJECTS.map((subject, index) => {
    const value = (seed * (index + 3)) % 51; // 0–50
    const score = 50 + value; // 50–100

    return { subject, score };
  });
}
