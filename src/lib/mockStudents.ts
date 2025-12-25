import { generateStudentScores } from "./generateScores";

export const mockStudents = [
  {
    name: "Kairat",
    scores: generateStudentScores("Kairat"),
  },
  {
    name: "Aruzhan",
    scores: generateStudentScores("Aruzhan"),
  },
];
