import type { Task } from "../tasks";
import { getExamDefinition } from "../exams";
import { getExamNumberXPScoringRule } from "../exam-scores";
import { originalProvenance, type ContentProvenance } from "./provenance";

type Derived = "subjectId" | "examYear" | "examVersionId" | "part" |
  "difficulty" | "answerFormat" | "source" | "scoring" | "provenance";
export type OriginalTaskInput = Omit<Task, Derived> & {
  difficulty?: Task["difficulty"];
  creationMethod?: ContentProvenance["creation_method"];
};

/** Deterministic author content uses the same versioned scoring registry as practice. */
export function makeOriginalTask(data: OriginalTaskInput): Task {
  const { creationMethod = "original-deterministic-family", ...taskData } = data;
  const exam = getExamDefinition({ examType: data.examType[0], subjectId: "math", level: data.level });
  const number = exam?.numbers.find((entry) => entry.number === data.examNumber);
  if (!exam?.available || !number) throw new Error(`Unsupported original task: ${data.id}`);
  if ((number.part === 2) !== (data.answerRule.type === "self"))
    throw new Error(`Answer format does not match part: ${data.id}`);
  const scoring = getExamNumberXPScoringRule(exam.versionId, number.number);
  return {
    ...taskData,
    provenance: originalProvenance(creationMethod),
    subjectId: "math",
    examYear: exam.year,
    examVersionId: exam.versionId,
    part: number.part,
    difficulty: data.difficulty ?? (number.part === 1 ? "standard" : "advanced"),
    answerFormat: data.answerRule.type === "self" ? "extended" : data.answerRule.type,
    source: { kind: "author", label: "Авторское тренировочное задание · версия 1", revision: 1 },
    scoring: {
      status: scoring?.status ?? "pending-official-verification",
      maxPrimaryScore: scoring?.maxPrimaryScore ?? null,
    },
  };
}
