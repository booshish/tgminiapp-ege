import type { Task } from "./tasks";
import { checkTaskAnswer } from "./tasks";
import type { LearningState, AnswerEvent, SolutionEvent } from "./learning-events";
import { getAttemptXPAward, recordGameAttempt } from "./gamification";
import { getTaskXPScoringRule } from "./exam-scores";

/** Shared practice/mock transaction. Replaying the same request never creates an attempt. */
export function appendCheckedAnswer(
  state: LearningState, task: Task, answer: string, correct: boolean,
  id: string, solutionSeenBeforeCheck = false, createdAt = new Date().toISOString(),
): { state: LearningState; id: string; xpAwarded: number } {
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(id)) throw new Error("Invalid attempt ID");
  const checked = checkTaskAnswer(answer, task.answerRule);
  if (!checked.valid || checked.correct !== correct || task.answerRule.type === "self" || task.answerFormat === "extended" || (task.part === 2 && task.subjectId === "math"))
    throw new Error("Invalid checked answer");
  const saved = state.events.find((event) => event.id === id);
  if (saved) {
    if (saved.kind !== "answer_checked" || saved.taskId !== task.id ||
      saved.answer !== answer.trim() || saved.correct !== correct)
      throw new Error("Attempt ID conflict");
    return { state, id, xpAwarded: 0 };
  }
  const event: AnswerEvent = {
    kind: "answer_checked", id, taskId: task.id, topicId: task.topicId,
    prototypeId: task.prototypeId, examType: task.examType[0], subjectId: task.subjectId,
    level: task.level, examNumber: task.examNumber, examVersionId: task.examVersionId,
    examYear: task.examYear, part: task.part, answerFormat: "short", createdAt,
    answer: answer.trim(), correct,
    ...(solutionSeenBeforeCheck ? { solutionSeenBeforeCheck: true } : {}),
  };
  const game = recordGameAttempt(state.game, event, state.events, getTaskXPScoringRule(task));
  return {
    state: { ...state, events: [...state.events, event], game },
    id, xpAwarded: getAttemptXPAward(game, id),
  };
}

/** Records a viewed skipped solution without inventing an answer or changing the streak. */
export function appendMockSolutionExposure(
  state: LearningState, task: Task, mockSessionId: string,
  createdAt = new Date().toISOString(),
): LearningState {
  if (task.part !== 1 || !/^[a-zA-Z0-9_-]{1,100}$/.test(mockSessionId))
    throw new Error("Invalid mock solution exposure");
  if (state.events.some((event) => event.kind === "solution_viewed" && event.taskId === task.id))
    return state;
  const event: SolutionEvent = {
    kind: "solution_viewed", id: `view:${mockSessionId}:${task.id}`,
    taskId: task.id, topicId: task.topicId, prototypeId: task.prototypeId,
    examType: task.examType[0], subjectId: task.subjectId, level: task.level,
    examNumber: task.examNumber, examVersionId: task.examVersionId, examYear: task.examYear,
    part: 1, answerFormat: "short", createdAt, source: "completed-mock", mockSessionId,
  };
  return { ...state, events: [...state.events, event] };
}
