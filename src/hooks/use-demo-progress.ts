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
import { checkTaskAnswer, type Task } from "@/lib/tasks";
import { emptyGameState, recordGameAttempt } from "@/lib/gamification";
import { getTaskXPScoringRule } from "@/lib/exam-scores";
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
  const stateRef = useRef(state);
  const updateState = useCallback(
    (update: (previous: LearningState) => LearningState) => {
      const next = update(stateRef.current);
      if (next === stateRef.current) return;
      stateRef.current = next;
      // Commit events and their XP ledger together before the user can reload.
      if (canPersist.current) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          setStorageWarning(true);
        }
      }
      setState(next);
    },
    [],
  );
  useEffect(() => {
    // A failed read must never be followed by writing an empty replacement.
    // Keep this decision stable when Strict Mode repeats mount effects.
    if (initialReadAttempted.current) return;
    initialReadAttempted.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (
          !stored ||
          typeof stored !== "object" ||
          !("version" in stored) ||
          ![2, 3].includes(Number(stored.version))
        )
          throw new Error("Unsupported learning data");
      }
      const restored = parseLearningState(
        raw,
        window.localStorage.getItem(legacyStorageKey),
      );
      stateRef.current = restored;
      setState(restored);
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
    (exam: Exam) =>
      updateState((previous) =>
        previous.exam === exam ? previous : { ...previous, exam },
      ),
    [updateState],
  );
  const setFontScale = useCallback(
    (fontScale: LearningState["fontScale"]) =>
      updateState((previous) => ({ ...previous, fontScale })),
    [updateState],
  );
  const setTheme = useCallback(
    (theme: LearningState["theme"]) =>
      updateState((previous) => ({ ...previous, theme, themeExplicit: true })),
    [updateState],
  );
  const setFocusMode = useCallback(
    (focusMode: boolean) =>
      updateState((previous) => ({ ...previous, focusMode })),
    [updateState],
  );
  const rememberTask = useCallback(
    (lastTaskIndex: number) =>
      updateState((previous) =>
        previous.lastTaskIndex === lastTaskIndex
          ? previous
          : { ...previous, lastTaskIndex },
      ),
    [updateState],
  );
  const recordAnswer = useCallback(
    (task: Task, answer: string, correct: boolean) => {
      const id = eventId();
      const checked = checkTaskAnswer(answer, task.answerRule);
      if (!checked.valid || checked.correct !== correct)
        throw new Error("Invalid checked answer");
      updateState((previous) => {
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
          examVersionId: task.examVersionId,
          part: task.part,
          answerFormat: task.part === 2 ? "extended" : "short",
          createdAt: new Date().toISOString(),
          answer: answer.trim(),
          correct,
        };
        return {
          ...previous,
          events: [...previous.events, event],
          game: recordGameAttempt(
            previous.game,
            event,
            previous.events,
            getTaskXPScoringRule(task),
          ),
        };
      });
      return id;
    },
    [updateState],
  );
  const recordSolutionViewed = useCallback(
    (task: Task, attemptId: string) => {
      updateState((previous) => {
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
          ...(attempt.examVersionId
            ? {
                examVersionId: attempt.examVersionId,
                part: attempt.part,
                answerFormat: attempt.answerFormat,
              }
            : {}),
          ...(attempt.level !== undefined || attempt.examNumber !== undefined
            ? { level: attempt.level, examNumber: attempt.examNumber }
            : {}),
          createdAt: new Date().toISOString(),
          attemptId,
        };
        return { ...previous, events: [...previous.events, event] };
      });
    },
    [updateState],
  );
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
    const cleared = {
      ...emptyLearningState,
      events: [],
      legacyRecords: [],
      game: emptyGameState(),
    };
    stateRef.current = cleared;
    setState(cleared);
    return true;
  }, []);
  return {
    state,
    ready,
    storageWarning,
    dismissStorageWarning: () => setStorageWarning(false),
    setExam,
    setFontScale,
    setTheme,
    setFocusMode,
    rememberTask,
    recordAnswer,
    recordSolutionViewed,
    clearLocalData,
  };
}
