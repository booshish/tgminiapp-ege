"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyProgress,
  parseProgress,
  storageKey,
  type DemoProgress,
} from "@/lib/demo";
import type { Exam } from "@/lib/navigation";

export function useDemoProgress() {
  const [progress, setProgress] = useState<DemoProgress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    try {
      setProgress(parseProgress(window.localStorage.getItem(storageKey)));
    } catch {
      setStorageWarning(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      setStorageWarning(true);
    }
  }, [progress, ready]);

  const setExam = useCallback(
    (exam: Exam) => setProgress((previous) => ({ ...previous, exam })),
    [],
  );
  const rememberTask = useCallback(
    (taskIndex: number) =>
      setProgress((previous) =>
        previous.lastTaskIndex === taskIndex
          ? previous
          : { ...previous, lastTaskIndex: taskIndex },
      ),
    [],
  );
  const recordAnswer = useCallback((taskId: string, correct: boolean) => {
    setProgress((previous) => {
      const existing = previous.records.find(
        (record) => record.taskId === taskId,
      );
      if (existing?.correct) return previous;
      return {
        ...previous,
        records: [
          ...previous.records.filter((record) => record.taskId !== taskId),
          { taskId, correct, attempts: (existing?.attempts ?? 0) + 1 },
        ],
      };
    });
  }, []);
  const resetProgress = useCallback(
    () =>
      setProgress((previous) => ({
        ...emptyProgress,
        records: [],
        exam: previous.exam,
      })),
    [],
  );

  return {
    progress,
    ready,
    storageWarning,
    dismissStorageWarning: () => setStorageWarning(false),
    setExam,
    rememberTask,
    recordAnswer,
    resetProgress,
  };
}
