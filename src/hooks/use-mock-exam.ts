"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamDefinition } from "@/lib/exams";
import { getAvailableExamDefinitions } from "@/lib/exams";
import { tasks, type Task } from "@/lib/tasks";
import {
  createMockSession, emptyMockState, finishMockSession, mockExamStorageKey,
  parseMockState, selectMockPosition, setMockSelfScore, updateMockAnswer,
  type MockSession, type MockState,
} from "@/lib/mock-exam";

export type MockCallbacks = {
  onAnswer: (task: Task, input: string, correct: boolean, solutionSeen?: boolean, requestId?: string) => { id: string; xpAwarded: number };
  onSolutionViewed: (task: Task, attemptId: string | undefined, sessionId: string) => void;
  onSelfAssessment: (task: Task, score: number) => { score: number; maxScore: number; deltaXP: number };
};

export function useMockExam(callbacks: MockCallbacks) {
  const [state, setState] = useState<MockState>(emptyMockState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const current = useRef(state);
  const canPersist = useRef(false);
  const mounted = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const publishing = useRef(new Set<string>());

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    try {
      const restored = parseMockState(localStorage.getItem(mockExamStorageKey), tasks, getAvailableExamDefinitions());
      current.current = restored;
      setState(restored);
      canPersist.current = true;
    } catch {
      // Unknown/corrupt data stays untouched. New work can continue in memory.
      setStorageWarning(true);
    }
    setReady(true);
  }, []);

  const commit = useCallback((next: MockState) => {
    // The snapshot is written before callbacks that modify the learning journal.
    current.current = next;
    if (canPersist.current) {
      try { localStorage.setItem(mockExamStorageKey, JSON.stringify(next)); }
      catch { setStorageWarning(true); }
    }
    setState(next);
  }, []);

  const changeSession = useCallback((id: string, change: (session: MockSession) => MockSession) => {
    const prior = current.current;
    const session = prior.sessions.find((entry) => entry.id === id);
    if (!session) return;
    const next = change(session);
    if (next !== session) commit({ ...prior, sessions: prior.sessions.map((entry) => entry.id === id ? next : entry) });
  }, [commit]);

  const publishResults = useCallback((sessionId: string) => {
    if (publishing.current.has(sessionId)) return;
    publishing.current.add(sessionId);
    try {
      const session = current.current.sessions.find((entry) => entry.id === sessionId);
      if (!session || session.finishedAt === null) return;
      for (const taskId of session.taskIds) {
        const result = session.results[taskId];
        if (!result?.valid || !result.requestId || session.publishedTaskIds.includes(taskId)) continue;
        const task = tasks.find((entry) => entry.id === taskId);
        if (!task) continue;
        const recorded = callbacksRef.current.onAnswer(task, session.answers[taskId] ?? "", result.correct, false, result.requestId);
        if (recorded.id !== result.requestId) throw new Error("Unstable attempt identity");
        changeSession(session.id, (latest) => ({ ...latest, publishedTaskIds: [...new Set([...latest.publishedTaskIds, taskId])] }));
      }
      setActionError("");
    } catch {
      setActionError("Результат варианта сохранён, но запись попыток прервалась. Нажми «Сохранить результаты» ещё раз: повторных XP не будет.");
    } finally {
      publishing.current.delete(sessionId);
    }
  }, [changeSession]);

  const finish = useCallback((id: string, at = Date.now()) => {
    changeSession(id, (session) => finishMockSession(session, tasks, at));
    publishResults(id);
  }, [changeSession, publishResults]);

  const hasUnfinishedSession = state.sessions.some((session) => session.finishedAt === null);

  useEffect(() => {
    if (!ready || !hasUnfinishedSession) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      for (const session of current.current.sessions) {
        if (session.finishedAt === null && time >= session.deadline) finish(session.id, time);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [ready, hasUnfinishedSession, finish]);

  useEffect(() => {
    if (!ready) return;
    for (const session of current.current.sessions) {
      if (session.finishedAt !== null && Object.values(session.results).some((result) => result.valid && !session.publishedTaskIds.includes(result.taskId))) publishResults(session.id);
    }
  }, [ready, publishResults]);

  const active = state.sessions.find((session) => session.id === state.activeId) ?? null;
  return {
    state, active, ready, now, storageWarning, actionError,
    start(definition: ExamDefinition) {
      try {
        const unfinished = current.current.sessions.find((session) => session.finishedAt === null);
        if (unfinished) { commit({ ...current.current, activeId: unfinished.id }); return; }
        const id = `mock-${crypto.randomUUID()}`;
        const session = createMockSession(id, definition, tasks, current.current.sessions, Date.now());
        commit({ ...current.current, sessions: [...current.current.sessions, session], activeId: session.id });
        setActionError("");
      } catch { setActionError("Не удалось создать вариант. Проверь доступность всех номеров и попробуй снова."); }
    },
    open(id: string | null) {
      if (id === null || current.current.sessions.some((session) => session.id === id)) commit({ ...current.current, activeId: id });
    },
    answer(taskId: string, answer: string) {
      const id = current.current.activeId;
      if (id) changeSession(id, (session) => updateMockAnswer(session, taskId, answer));
    },
    position(position: number) {
      const id = current.current.activeId;
      if (id) changeSession(id, (session) => selectMockPosition(session, position));
    },
    finish() { if (current.current.activeId) finish(current.current.activeId); },
    retryPublish() { if (current.current.activeId) publishResults(current.current.activeId); },
    reveal(task: Task) {
      const session = current.current.sessions.find((entry) => entry.id === current.current.activeId);
      if (!session || session.finishedAt === null || !session.taskIds.includes(task.id) || session.revealedTaskIds.includes(task.id)) return;
      try {
        const result = session.results[task.id];
        // Finish publication first, so a solution always refers to a real attempt.
        if (result?.valid && !session.publishedTaskIds.includes(task.id)) publishResults(session.id);
        if (task.part === 1) {
          const latest = current.current.sessions.find((entry) => entry.id === session.id)!;
          if (result?.valid && !latest.publishedTaskIds.includes(task.id)) throw new Error("Attempt is not yet recorded");
          callbacksRef.current.onSolutionViewed(task, result?.requestId ?? undefined, session.id);
        }
        changeSession(session.id, (latest) => ({ ...latest, revealedTaskIds: [...new Set([...latest.revealedTaskIds, task.id])] }));
        setActionError("");
      } catch { setActionError("Не удалось записать просмотр решения. Попробуй ещё раз."); }
    },
    assess(task: Task, score: number) {
      const session = current.current.sessions.find((entry) => entry.id === current.current.activeId);
      if (!session || setMockSelfScore(session, task, score) === session) return;
      try {
        callbacksRef.current.onSelfAssessment(task, score);
        changeSession(session.id, (latest) => setMockSelfScore(latest, task, score));
        setActionError("");
      } catch { setActionError("Не удалось сохранить самопроверку. Попробуй ещё раз."); }
    },
  };
}
