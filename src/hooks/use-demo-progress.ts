"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyLearningState,
  parseLearningState,
  storageKey,
  legacyStorageKey,
  type LearningState,
  type AnswerEvent,
  type SolutionEvent,
} from "@/lib/learning-events";
import type { Task } from "@/lib/tasks";
import type { Exam } from "@/lib/navigation";

function eventId() {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDemoProgress() {
  const [state, setState] = useState<LearningState>(emptyLearningState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const initialReadAttempted = useRef(false);
  const canPersist = useRef(false);
  useEffect(() => {
    // A failed read must never be followed by writing an empty replacement.
    // Keep this decision stable when Strict Mode repeats mount effects.
    if (initialReadAttempted.current) return;
    initialReadAttempted.current = true;
    try {
      setState(
        parseLearningState(
          window.localStorage.getItem(storageKey),
          window.localStorage.getItem(legacyStorageKey),
        ),
      );
      canPersist.current = true;
    } catch {
      canPersist.current = false;
      setStorageWarning(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !canPersist.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      setStorageWarning(true);
    }
  }, [state, ready]);

  const setExam = useCallback(
    (exam: Exam) => setState((previous) => ({ ...previous, exam })),
    [],
  );
  const setFontScale = useCallback(
    (fontScale: LearningState["fontScale"]) =>
      setState((previous) => ({ ...previous, fontScale })),
    [],
  );
  const rememberTask = useCallback(
    (lastTaskIndex: number) =>
      setState((previous) =>
        previous.lastTaskIndex === lastTaskIndex
          ? previous
          : { ...previous, lastTaskIndex },
      ),
    [],
  );
  const recordAnswer = useCallback(
    (task: Task, answer: string, correct: boolean) => {
      const id = eventId();
      setState((previous) => {
        const event: AnswerEvent = {
          kind: "answer_checked",
          id,
          taskId: task.id,
          topicId: task.topicId,
          prototypeId: task.prototypeId,
          examType: task.examType[0],
          subjectId: "math",
          level: task.level,
          examNumber: task.examNumber,
          createdAt: new Date().toISOString(),
          answer: answer.trim(),
          correct,
        };
        return { ...previous, events: [...previous.events, event] };
      });
      return id;
    },
    [],
  );
  const recordSolutionViewed = useCallback((task: Task, attemptId: string) => {
    setState((previous) => {
      const attempt = previous.events.find(
        (event) =>
          event.kind === "answer_checked" &&
          event.id === attemptId &&
          event.taskId === task.id,
      );
      if (!attempt) return previous;
      if (
        previous.events.some(
          (event) =>
            event.kind === "solution_viewed" && event.attemptId === attemptId,
        )
      )
        return previous;
      const event: SolutionEvent = {
        kind: "solution_viewed",
        id: eventId(),
        taskId: task.id,
        topicId: task.topicId,
        prototypeId: task.prototypeId,
        examType: attempt.examType,
        subjectId: "math",
        ...(attempt.level !== undefined || attempt.examNumber !== undefined
          ? { level: attempt.level, examNumber: attempt.examNumber }
          : {}),
        createdAt: new Date().toISOString(),
        attemptId,
      };
      return { ...previous, events: [...previous.events, event] };
    });
  }, []);
  const clearLocalData = useCallback(() => {
    // Only an explicit successful reset may re-enable persistence after a read failure.
    canPersist.current = false;
    try {
      window.localStorage.removeItem(legacyStorageKey);
      window.localStorage.removeItem(storageKey);
      canPersist.current = true;
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
      return false;
    }
    setState({ ...emptyLearningState, events: [], legacyRecords: [] });
    return true;
  }, []);
  return {
    state,
    ready,
    storageWarning,
    dismissStorageWarning: () => setStorageWarning(false),
    setExam,
    setFontScale,
    rememberTask,
    recordAnswer,
    recordSolutionViewed,
    clearLocalData,
  };
}
