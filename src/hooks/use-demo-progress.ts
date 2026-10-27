"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyLearningState,
  parseLearningState,
  storageKey,
  legacyStorageKey,
  type LearningState,
  type SolutionEvent,
  type SelfAssessmentEvent,
} from "@/lib/learning-events";
import type { Task } from "@/lib/tasks";
import {
  emptyGameState,
  recordSelfAssessment,
  getSelfAssessment,
  getGameSummary,
} from "@/lib/gamification";
import { getTaskXPScoringRule } from "@/lib/exam-scores";
import type { Exam } from "@/lib/navigation";
import { appendCheckedAnswer, appendMockSolutionExposure } from "@/lib/learning-mutations";
import { getTaskOrigin } from "@/lib/task-placement";

function eventId() {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDemoProgress(enabled = true) {
  const [state, setState] = useState<LearningState>(emptyLearningState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const initialReadAttempted = useRef(false);
  const canPersist = useRef(false);
  const pendingWrite = useRef(false);
  const stateRef = useRef(state);
  const updateState = useCallback(
    (update: (previous: LearningState) => LearningState, requirePersistence = false) => {
      if (requirePersistence && !canPersist.current) {
        setStorageWarning(true);
        throw new Error("Learning storage is unavailable");
      }
      // Refresh the canonical local ledger before a mutation; other tabs may have changed it.
      if (canPersist.current && !pendingWrite.current) {
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            const value: unknown = JSON.parse(raw);
            if (
              value &&
              typeof value === "object" &&
              "version" in value &&
              (value.version === 2 || value.version === 3)
            ) {
              stateRef.current = parseLearningState(raw);
            } else if (requirePersistence) throw new Error("Unsupported learning data");
          }
        } catch (error) {
          setStorageWarning(true);
          if (requirePersistence) throw error;
        }
      }
      const next = update(stateRef.current);
      if (next === stateRef.current && !requirePersistence) {
        setState(next);
        return;
      }
      // Commit events and their XP ledger together before the user can reload.
      // A mock must not acknowledge publication or expose a solution until this write succeeds.
      if (canPersist.current) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
          pendingWrite.current = false;
        } catch (error) {
          setStorageWarning(true);
          if (requirePersistence) throw error;
          pendingWrite.current = true;
        }
      }
      stateRef.current = next;
      setState(next);
    },
    [],
  );
  useEffect(() => {
    // A failed read must never be followed by writing an empty replacement.
    // Keep this decision stable when Strict Mode repeats mount effects.
    if (!enabled || initialReadAttempted.current) return;
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
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(restored));
      } catch {
        pendingWrite.current = true;
        setStorageWarning(true);
      }
    } catch {
      canPersist.current = false;
      setStorageWarning(true);
    }
    setReady(true);
  }, [enabled]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (
        (event.key !== storageKey && event.key !== null) ||
        !canPersist.current ||
        pendingWrite.current
      )
        return;
      try {
        if (event.newValue) {
          const value: unknown = JSON.parse(event.newValue);
          if (
            !value ||
            typeof value !== "object" ||
            !("version" in value) ||
            (value.version !== 2 && value.version !== 3)
          )
            throw new Error("Invalid shared state");
        }
        const restored = event.newValue
          ? parseLearningState(event.newValue)
          : {
              ...emptyLearningState,
              events: [],
              legacyRecords: [],
              game: emptyGameState(),
            };
        stateRef.current = restored;
        setState(restored);
      } catch {
        setStorageWarning(true);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

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
      updateState((previous) => ({ ...previous, theme })),
    [updateState],
  );
  const setFocusMode = useCallback(
    (focusMode: boolean) =>
      updateState((previous) => ({ ...previous, focusMode })),
    [updateState],
  );
  const setBreakReminderMinutes = useCallback(
    (breakReminderMinutes: LearningState["breakReminderMinutes"]) =>
      updateState((previous) => ({ ...previous, breakReminderMinutes })),
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
    (task: Task, answer: string, correct: boolean, solutionSeenBeforeCheck = false, requestId?: string) => {
      const id = requestId ?? eventId();
      let xpAwarded = 0;
      updateState((previous) => {
        const result = appendCheckedAnswer(previous, task, answer, correct, id, solutionSeenBeforeCheck);
        xpAwarded = result.xpAwarded;
        return result.state;
      }, Boolean(requestId));
      return { id, xpAwarded };
    },
    [updateState],
  );
  const recordSolutionExposed = useCallback(
    (task: Task, mockSessionId: string) => {
      updateState((previous) => appendMockSolutionExposure(previous, task, mockSessionId), true);
    },
    [updateState],
  );
  const confirmSelfAssessment = useCallback(
    (task: Task, score: number, requirePersistence = false) => {
      task=getTaskOrigin(task);
      const rule = getTaskXPScoringRule(task);
      if (
        !rule ||
        task.part !== 2 ||
        !Number.isInteger(score) ||
        score < 0 ||
        score > rule.maxPrimaryScore
      )
        throw new Error("Invalid self-assessment");
      let result = { score, maxScore: rule.maxPrimaryScore, deltaXP: 0 };
      updateState((previous) => {
        const current = getSelfAssessment(previous.game, task.id);
        if (current?.score === score) return previous;
        const event: SelfAssessmentEvent = {
          kind: "self_assessed",
          id: eventId(),
          taskId: task.id,
          topicId: task.topicId,
          prototypeId: task.prototypeId,
          examType: task.examType[0],
          subjectId: task.subjectId,
          level: task.level,
          examNumber: task.examNumber,
          examVersionId: task.examVersionId,
          examYear: task.examYear,
          part: 2,
          answerFormat: "extended",
          createdAt: new Date().toISOString(),
          score,
          maxScore: rule.maxPrimaryScore,
        };
        const game = recordSelfAssessment(
          previous.game,
          event,
          previous.events,
          rule,
        );
        if (game === previous.game)
          throw new Error("Self-assessment could not be recorded");
        result = {
          ...result,
          deltaXP:
            getGameSummary(game).totalXP -
            getGameSummary(previous.game).totalXP,
        };
        return { ...previous, events: [...previous.events, event], game };
      }, requirePersistence);
      return result;
    },
    [updateState],
  );
  const recordSolutionViewed = useCallback(
    (task: Task, attemptId: string, requirePersistence = false) => {
      updateState((previous) => {
        const attempt = previous.events.find(
          (event) =>
            event.kind === "answer_checked" &&
            event.id === attemptId &&
            event.taskId === task.id,
        );
        if (!attempt) {
          if (requirePersistence) throw new Error("Missing persisted attempt");
          return previous;
        }
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
          subjectId: task.subjectId,
          ...(attempt.examVersionId
            ? {
                examVersionId: attempt.examVersionId,
                ...(attempt.examYear !== undefined
                  ? { examYear: attempt.examYear }
                  : {}),
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
      }, requirePersistence);
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
    pendingWrite.current = false;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cleared));
    } catch {
      pendingWrite.current = true;
      setStorageWarning(true);
      setState(cleared);
      return false;
    }
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
    setBreakReminderMinutes,
    rememberTask,
    recordAnswer,
    confirmSelfAssessment,
    recordSolutionViewed,
    recordSolutionExposed,
    clearLocalData,
  };
}
