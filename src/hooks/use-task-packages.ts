"use client";
import { useEffect, useState } from "react";
import type { Route } from "@/lib/navigation";
import { ensureTaskPackages } from "@/lib/task-packages";

/** Restore previously used shards BEFORE parsing stored task IDs/drafts. */
export function useTaskPackages(route: Route, enabled: boolean) {
  const key = JSON.stringify([route.exam, route.subjectId, route.level,route.examNumber, route.topicId, route.prototypeId, route.taskId,route.subtypeId,route.taxonomyTopicId,route.subtopicId,route.sourceCategoryId]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setError("");
    let saved = route.taskId ?? "";
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if (name?.startsWith("tochka")) saved += localStorage.getItem(name) ?? "";
      }
    } catch { /* The existing storage warning owns unavailable storage. */ }
    ensureTaskPackages(route.exam && route.subjectId ? { examType:route.exam,subjectId:route.subjectId,level:route.level,examNumber:route.examNumber,topicId:route.topicId,prototypeId:route.prototypeId,subtypeId:route.subtypeId,taxonomyTopicId:route.taxonomyTopicId,subtopicId:route.subtopicId,sourceCategoryId:route.sourceCategoryId } : undefined, saved)
      .then(() => { if (alive) setLoaded(key); })
      .catch(() => { if (alive) setError("Не удалось загрузить задания. Сохранённые ответы не изменены. Обновите страницу, чтобы повторить."); });
    return () => { alive = false; };
  }, [enabled, key, route.exam, route.subjectId, route.level,route.examNumber, route.topicId, route.prototypeId, route.taskId,route.subtypeId,route.taxonomyTopicId,route.subtopicId,route.sourceCategoryId]);
  return { ready: enabled && loaded === key, error };
}
