/** @deprecated Import the task bank and learning events from their dedicated modules. */
export { tasks, prototypes, getPracticeTasks, checkTaskAnswer } from "./tasks";
export type { Task, AnswerRule, Exam, SubjectId } from "./tasks";
export {
  storageKey,
  legacyStorageKey,
  emptyLearningState,
  parseLearningState,
  getAnalytics,
} from "./learning-events";
export type {
  AnswerEvent,
  SolutionEvent,
  LearningEvent,
  LearningState,
  LearningAnalytics,
  ProgressRecord,
} from "./learning-events";
