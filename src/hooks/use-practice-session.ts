"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exam, Route, Selection, View } from "@/lib/navigation";
import { tasks } from "@/lib/tasks";
import {
  createPracticeSession,
  defaultCatalogSelection,
  normalizeCatalogSelection,
  updateSessionTask,
  type CatalogSelection,
  type PracticeSession,
  type PracticeTaskState,
} from "@/lib/practice";

type Props = {
  route: Route;
  navigate: (view: View, selection?: number | Selection) => void;
  ready: boolean;
  exam: Exam;
  setExam: (exam: Exam) => void;
};

export function catalogRoute(selection: CatalogSelection): Selection {
  return {
    exam: selection.exam,
    subjectId: selection.subjectId,
    level: selection.level,
    catalogMode: selection.mode,
    examNumber: selection.examNumber,
    topicId: selection.topicId,
    prototypeId: selection.prototypeId,
  };
}

function selectionFromRoute(route: Route, fallback: CatalogSelection) {
  return normalizeCatalogSelection(
    {
      ...fallback,
      exam: route.exam ?? fallback.exam,
      level: route.level ?? fallback.level,
      mode:
        route.catalogMode ??
        (route.examNumber ? "number" : route.topicId ? "topic" : fallback.mode),
      examNumber: route.examNumber,
      topicId: route.topicId,
      prototypeId: route.prototypeId,
    },
    fallback.exam,
  );
}

let sessionCounter = 0;
function newSessionId() {
  sessionCounter += 1;
  return `practice-${Date.now().toString(36)}-${sessionCounter}`;
}

/** Drafts live in this tab's running app. Only explicit checks create learning events. */
export function usePracticeSession({
  route,
  navigate,
  ready,
  exam,
  setExam,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogSelection>(
    defaultCatalogSelection,
  );
  const [sessions, setSessions] = useState<Record<string, PracticeSession>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const initialRead = useRef(false);

  useEffect(() => {
    if (!ready || initialRead.current) return;
    initialRead.current = true;
    const initial = selectionFromRoute(route, defaultCatalogSelection(exam));
    setCatalog(initial);
    setInitialized(true);
  }, [ready, exam, route]);

  useEffect(() => {
    if (!initialized || route.view !== "catalog" || !route.exam) return;
    const selection = selectionFromRoute(
      route,
      defaultCatalogSelection(route.exam),
    );
    setCatalog((previous) =>
      JSON.stringify(previous) === JSON.stringify(selection)
        ? previous
        : selection,
    );
    if (exam !== selection.exam) setExam(selection.exam);
  }, [initialized, route, exam, setExam]);

  const requestedId = route.sessionId ?? activeId;
  const routeTask = tasks[route.taskIndex];
  const invalidContext = Boolean(
    route.invalidContext ||
    (route.view === "tasks" &&
      route.level &&
      (route.exam ?? routeTask?.examType[0]) === "ОГЭ"),
  );
  const cachedSession = requestedId ? sessions[requestedId] : undefined;
  const selectionMatches =
    !cachedSession ||
    ((!route.exam || route.exam === cachedSession.selection.exam) &&
      (!route.level ||
        cachedSession.selection.exam === "ОГЭ" ||
        route.level === cachedSession.selection.level) &&
      (!route.examNumber ||
        route.examNumber === cachedSession.selection.examNumber) &&
      (!route.topicId || route.topicId === cachedSession.selection.topicId) &&
      (!route.prototypeId ||
        route.prototypeId === cachedSession.selection.prototypeId) &&
      (!route.catalogMode ||
        JSON.stringify(selectionFromRoute(route, cachedSession.selection)) ===
          JSON.stringify(cachedSession.selection)) &&
      (Boolean(route.sessionId) ||
        cachedSession.taskIds.length === 0 ||
        Boolean(routeTask && cachedSession.taskIds.includes(routeTask.id))));
  const contextMatches =
    !cachedSession ||
    route.view !== "tasks" ||
    (Boolean(cachedSession.invalidContext) === invalidContext &&
      (invalidContext || selectionMatches));
  const blockedLink =
    route.view === "tasks" &&
    Boolean(route.sessionId && cachedSession) &&
    !contextMatches;
  // A conflicting URL gets an empty view, never a replacement for the saved session.
  const session = useMemo<PracticeSession | undefined>(
    () =>
      blockedLink && cachedSession
        ? {
            id: cachedSession.id,
            selection: selectionFromRoute(route, cachedSession.selection),
            taskIds: [],
            lastPosition: 0,
            states: {},
            invalidContext: true,
          }
        : contextMatches
          ? cachedSession
          : undefined,
    [blockedLink, cachedSession, contextMatches, route],
  );
  const position =
    session && routeTask ? session.taskIds.indexOf(routeTask.id) : -1;
  const currentTask = position >= 0 ? routeTask : undefined;

  useEffect(() => {
    if (!initialized || !ready || route.view !== "tasks" || blockedLink) return;
    if (session) {
      if (activeId !== session.id) setActiveId(session.id);
      if (exam !== session.selection.exam) setExam(session.selection.exam);
      setCatalog((previous) =>
        JSON.stringify(previous) === JSON.stringify(session.selection)
          ? previous
          : session.selection,
      );
      if (position >= 0 && position !== session.lastPosition) {
        setSessions((previous) => ({
          ...previous,
          [session.id]: { ...previous[session.id], lastPosition: position },
        }));
      }
      return;
    }

    const requestedTask = tasks[route.taskIndex];
    const selectedExam = route.exam ?? requestedTask?.examType[0] ?? exam;
    const fallback = defaultCatalogSelection(selectedExam);
    if (selectedExam === "ЕГЭ" && requestedTask?.level)
      fallback.level = requestedTask.level;
    let selection = selectionFromRoute(route, fallback);
    if (
      !route.catalogMode &&
      !route.examNumber &&
      !route.topicId &&
      requestedTask
    ) {
      selection = normalizeCatalogSelection({
        ...selection,
        mode: requestedTask.examNumber === null ? "topic" : "number",
        examNumber: requestedTask.examNumber ?? undefined,
        topicId:
          requestedTask.examNumber === null ? requestedTask.topicId : undefined,
      });
    }
    const id = route.sessionId ?? newSessionId();
    const created = createPracticeSession(id, selection, requestedTask?.id);
    // A stale or mismatched direct link must never silently substitute another task.
    if (invalidContext) created.invalidContext = true;
    if (
      invalidContext ||
      !requestedTask ||
      !created.taskIds.includes(requestedTask.id)
    )
      created.taskIds = [];
    setSessions((previous) => ({ ...previous, [id]: created }));
    setCatalog(selection);
    setActiveId(id);
    if (exam !== selection.exam) setExam(selection.exam);
  }, [
    initialized,
    ready,
    route,
    session,
    activeId,
    position,
    exam,
    setExam,
    blockedLink,
    invalidContext,
  ]);

  const changeCatalog = useCallback(
    (next: CatalogSelection) => {
      const selection = normalizeCatalogSelection(next);
      setCatalog(selection);
      setExam(selection.exam);
      if (route.view === "catalog")
        navigate("catalog", catalogRoute(selection));
    },
    [navigate, route.view, setExam],
  );

  const changeExam = useCallback(
    (nextExam: Exam) => {
      if (nextExam === catalog.exam && nextExam === exam) return;
      const next = { ...defaultCatalogSelection(nextExam), mode: catalog.mode };
      changeCatalog(next);
    },
    [catalog.exam, catalog.mode, changeCatalog, exam],
  );

  const openCatalog = useCallback(() => {
    navigate("catalog", catalogRoute(catalog));
  }, [catalog, navigate]);

  const start = useCallback(
    (next: CatalogSelection, initialTaskId?: string) => {
      const selection = normalizeCatalogSelection(next);
      const previous = Object.values(sessions)
        .reverse()
        .find(
          (candidate) =>
            !candidate.invalidContext &&
            JSON.stringify(candidate.selection) === JSON.stringify(selection),
        );
      if (previous) {
        setCatalog(selection);
        setExam(selection.exam);
        setActiveId(previous.id);
        const taskId = previous.taskIds[previous.lastPosition];
        navigate("tasks", {
          ...catalogRoute(selection),
          taskIndex: tasks.findIndex((task) => task.id === taskId),
          sessionId: previous.id,
        });
        return;
      }
      const created = createPracticeSession(
        newSessionId(),
        selection,
        initialTaskId,
      );
      setCatalog(selection);
      setExam(selection.exam);
      setSessions((previous) => ({ ...previous, [created.id]: created }));
      setActiveId(created.id);
      const firstId = created.taskIds[created.lastPosition];
      navigate("tasks", {
        ...catalogRoute(selection),
        taskIndex: tasks.findIndex((task) => task.id === firstId),
        sessionId: created.id,
      });
    },
    [navigate, setExam, sessions],
  );

  const move = useCallback(
    (offset: -1 | 1) => {
      if (!session) return;
      const nextId = session.taskIds[position + offset];
      if (!nextId) return;
      navigate("tasks", {
        ...catalogRoute(session.selection),
        taskIndex: tasks.findIndex((task) => task.id === nextId),
        sessionId: session.id,
      });
    },
    [navigate, session, position],
  );

  const changeTask = useCallback(
    (value: PracticeTaskState) => {
      if (!session || !currentTask) return;
      setSessions((previous) => ({
        ...previous,
        [session.id]: updateSessionTask(
          previous[session.id],
          currentTask.id,
          value,
        ),
      }));
    },
    [session, currentTask],
  );

  const returnToCatalog = useCallback(() => {
    const selection = session?.selection ?? catalog;
    setCatalog(selection);
    setExam(selection.exam);
    navigate("catalog", catalogRoute(selection));
  }, [catalog, session, navigate, setExam]);

  const resume = useCallback(() => {
    const previous = activeId ? sessions[activeId] : undefined;
    const taskId = previous?.taskIds[previous.lastPosition];
    if (
      !previous ||
      !taskId ||
      previous.selection.exam !== exam ||
      (exam === "ЕГЭ" && previous.selection.level !== catalog.level)
    )
      return false;
    navigate("tasks", {
      ...catalogRoute(previous.selection),
      taskIndex: tasks.findIndex((task) => task.id === taskId),
      sessionId: previous.id,
    });
    return true;
  }, [activeId, sessions, exam, catalog.level, navigate]);

  const reset = useCallback(() => {
    setSessions({});
    setActiveId(null);
    setCatalog(defaultCatalogSelection());
  }, []);

  return {
    catalog,
    initialized,
    session,
    currentTask,
    position,
    changeCatalog,
    changeExam,
    openCatalog,
    start,
    move,
    changeTask,
    returnToCatalog,
    resume,
    reset,
  };
}
