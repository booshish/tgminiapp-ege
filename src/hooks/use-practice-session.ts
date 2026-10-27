"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exam, Route, Selection, View } from "@/lib/navigation";
import { getPracticeBankView, getPracticeTasks } from "@/lib/tasks";
import { taxonomyFilterKeys } from "@/lib/task-taxonomy";
import { ensureTaskPackages } from "@/lib/task-packages";
import { useTaskPackages } from "@/hooks/use-task-packages";
import { orderPracticeTasks } from "@/lib/practice-order";
import {
  createPracticeSession,
  findRecentPracticeSession,
  getSessionTaskId,
  practiceContextKey,
  rememberPracticePosition,
  defaultCatalogSelection,
  normalizeCatalogSelection,
  type CatalogSelection,
  type PracticeSession,
  type PracticeTaskState,
} from "@/lib/practice";
import {
  parseStoredPractice,
  isReadablePracticeStorage,
  serializeStoredPractice,
  practiceStorageKey,
  type StoredPractice,
} from "@/lib/practice-storage";

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
    subtypeId:selection.subtypeId,taxonomyTopicId:selection.taxonomyTopicId,subtopicId:selection.subtopicId,sourceCategoryId:selection.sourceCategoryId,
    part: selection.part,
  };
}

function selectionFromRoute(route: Route, fallback: CatalogSelection) {
  const task=route.taskId?getPracticeBankView().find(t=>t.id===route.taskId):undefined;
  return normalizeCatalogSelection(
    {
      ...fallback,
      exam: route.exam ?? fallback.exam,
      subjectId: route.subjectId ?? fallback.subjectId,
      level: route.level ?? fallback.level,
      mode:
        route.catalogMode ??
        (route.examNumber ? "number" : route.topicId ? "topic" : fallback.mode),
      examNumber: task?.placementReview?.compatible?task.examNumber??undefined:route.examNumber,
      topicId: route.topicId,
      prototypeId: route.prototypeId,
      subtypeId:route.subtypeId,taxonomyTopicId:route.taxonomyTopicId,subtopicId:route.subtopicId,sourceCategoryId:route.sourceCategoryId,
      part: route.part,
    },
    fallback.exam,
  );
}

let sessionCounter = 0;
function newSessionId() {
  sessionCounter += 1;
  return `practice-${Date.now().toString(36)}-${sessionCounter}`;
}

/** Hydrating drafts and checked states never creates learning or XP events. */
export function usePracticeSession({
  route,
  navigate,
  ready: progressReady,
  exam,
  setExam,
}: Props) {
  const tasks=getPracticeBankView();
  const packages = useTaskPackages(route, progressReady);
  const ready = packages.ready;
  const [catalog, setCatalog] = useState<CatalogSelection>(
    defaultCatalogSelection,
  );
  const [sessions, setSessions] = useState<Record<string, PracticeSession>>({});
  const [taskStates, setTaskStates] = useState<Record<string, PracticeTaskState>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [packageError, setPackageError] = useState("");
  const starting = useRef(false);
  const latestRoute = useRef(route);
  latestRoute.current = route;
  const initialRead = useRef(false);
  const canPersist = useRef(false);
  const latest = useRef<StoredPractice | null>(null);
  latest.current = { version: 2, catalog, sessions, activeId, taskStates };

  useEffect(() => {
    if (!ready || initialRead.current) return;
    initialRead.current = true;
    let fallback = defaultCatalogSelection(exam);
    try {
      const raw = window.localStorage.getItem(practiceStorageKey);
      if (!isReadablePracticeStorage(raw)) throw new Error("Unsupported or damaged practice storage");
      if (raw) {
        const restored = parseStoredPractice(raw);
        fallback = restored.catalog;
        setSessions(restored.sessions);
        setActiveId(restored.activeId);
        setTaskStates(restored.taskStates);
      }
      canPersist.current = true;
    } catch {
      // Never replace unread data with empty defaults after a storage exception.
      canPersist.current = false;
      setStorageWarning(true);
    }
    const hasRouteSelection = route.exam || route.subjectId || route.catalogMode || route.topicId || route.examNumber || route.prototypeId || route.level;
    const initial = hasRouteSelection ? selectionFromRoute(route, fallback) : fallback;
    setCatalog(initial);
    if (exam !== initial.exam) setExam(initial.exam);
    setInitialized(true);
  }, [ready, exam, route, setExam]);

  useEffect(() => {
    if (!ready || !initialized || !canPersist.current || !latest.current) return;
    try {
      window.localStorage.setItem(practiceStorageKey, serializeStoredPractice(latest.current));
    } catch {
      setStorageWarning(true);
    }
  }, [ready, initialized, catalog, sessions, activeId, taskStates]);

  useEffect(() => {
    const persist = () => {
      if (!ready || !initialized || !canPersist.current || !latest.current) return;
      try {
        window.localStorage.setItem(practiceStorageKey, serializeStoredPractice(latest.current));
      } catch {
        setStorageWarning(true);
      }
    };
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [ready, initialized]);

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
  const routeTask = route.taskId ? tasks.find((task) => task.id === route.taskId) : tasks[route.taskIndex];
  const invalidContext = Boolean(
    route.invalidContext ||
    (route.view === "tasks" &&
      route.level &&
      (route.exam ?? routeTask?.examType[0]) === "ОГЭ"),
  );
  const cachedSession = requestedId && Object.hasOwn(sessions, requestedId)
    ? sessions[requestedId]
    : undefined;
  const selectionMatches =
    !cachedSession ||
    ((!route.exam || route.exam === cachedSession.selection.exam) &&
      (!route.subjectId || route.subjectId === cachedSession.selection.subjectId) &&
      (!route.level ||
        cachedSession.selection.exam === "ОГЭ" ||
        route.level === cachedSession.selection.level) &&
      (!route.examNumber ||
        selectionFromRoute(route,cachedSession.selection).examNumber === cachedSession.selection.examNumber) &&
      (!route.topicId || route.topicId === cachedSession.selection.topicId) &&
      (!route.prototypeId ||
        route.prototypeId === cachedSession.selection.prototypeId) &&
      taxonomyFilterKeys.every(key=>!route[key]||route[key]===cachedSession.selection[key]) &&
      (!route.catalogMode ||
        practiceContextKey(selectionFromRoute(route, cachedSession.selection)) ===
          practiceContextKey(cachedSession.selection)) &&
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
          ? cachedSession ? { ...cachedSession, states: taskStates } : undefined
          : undefined,
    [blockedLink, cachedSession, contextMatches, route, taskStates],
  );
  // Stable IDs take precedence over the legacy numeric URL. A removed ID in a saved
  // session falls back within that same selection; never to another exam.
  const restoredId = session ? getSessionTaskId(session) : undefined;
  const targetId = session && route.sessionId && !route.taskId ? restoredId : routeTask?.id ?? restoredId;
  const position = session && targetId ? session.taskIds.indexOf(targetId) : -1;
  const currentTask = position >= 0 ? tasks.find((task) => task.id === targetId) : undefined;
  const nextVisit = useCallback((records: Record<string, PracticeSession>) =>
    Math.max(0, ...Object.values(records).map((item) => item.visitOrder ?? 0)) + 1, []);

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
      if (currentTask && position >= 0 && (position !== session.lastPosition || session.lastTaskId !== currentTask.id || activeId !== session.id)) {
        setSessions((previous) => ({
          ...previous,
          [session.id]: rememberPracticePosition(previous[session.id], currentTask.id, nextVisit(previous)),
        }));
      }
      return;
    }

    const requestedTask = routeTask;
    const selectedExam = route.exam ?? requestedTask?.examType[0] ?? exam;
    const fallback = defaultCatalogSelection(selectedExam);
    if (requestedTask) fallback.subjectId = requestedTask.subjectId;
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
    let created = createPracticeSession(id, selection, requestedTask?.id);
    const firstId = getSessionTaskId(created);
    if (firstId) created = rememberPracticePosition(created, firstId, nextVisit(sessions));
    // Conflicting exam/number links stay empty. A removed stable ID may fall back
    // only inside its explicit selection, not to a task from another exam.
    if (invalidContext) created.invalidContext = true;
    if (
      invalidContext ||
      (requestedTask && !created.taskIds.includes(requestedTask.id)) ||
      (!requestedTask && !route.taskId && route.taskIndex >= 0)
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
    routeTask,
    currentTask,
    nextVisit,
    sessions,
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
    const selection = catalog.exam === exam ? catalog : defaultCatalogSelection(exam);
    navigate("catalog", catalogRoute(selection));
  }, [catalog, exam, navigate]);

  const start = useCallback(
    async (next: CatalogSelection, initialTaskId?: string, shuffleSeenIds?: readonly string[]) => {
      const selection = normalizeCatalogSelection(next);
      if (starting.current) return;
      starting.current = true;
      const origin = latestRoute.current;
      setPackageError("");
      try {
        await ensureTaskPackages({ ...selection,examType: selection.exam, level:selection.level }, initialTaskId);
      } catch {
        setPackageError("Не удалось загрузить пакет заданий. Повторите выбор номера. Черновики сохранены.");
        return;
      } finally { starting.current = false; }
      if (latestRoute.current !== origin) return;
      const recent = findRecentPracticeSession(sessions, selection, true, activeId);
      const previous = recent ? { ...recent, taskIds: [...new Set([...recent.taskIds, ...getPracticeTasks({...selection, examType: selection.exam }).map((t) => t.id)])] } : undefined;
      if (previous && shuffleSeenIds === undefined && (!initialTaskId || previous.taskIds.includes(initialTaskId))) {
        setCatalog(selection);
        setExam(selection.exam);
        setActiveId(previous.id);
        const taskId = initialTaskId ?? getSessionTaskId(previous);
        if (!taskId) return;
        setSessions((records) => ({ ...records, [previous.id]: rememberPracticePosition(previous, taskId, nextVisit(records)) }));
        navigate("tasks", {
          ...catalogRoute(selection),
          taskIndex: tasks.findIndex((task) => task.id === taskId),
          taskId,
          sessionId: previous.id,
        });
        return;
      }
      let created = createPracticeSession(
        newSessionId(),
        selection,
        initialTaskId,
      );
      if (shuffleSeenIds !== undefined) {
        created.taskIds = orderPracticeTasks(created.taskIds, created.id, shuffleSeenIds);
        created.lastPosition = 0;
      }
      const initialId = created.taskIds[created.lastPosition];
      if (initialId) created = rememberPracticePosition(created, initialId, nextVisit(sessions));
      setCatalog(selection);
      setExam(selection.exam);
      setSessions((previous) => ({ ...previous, [created.id]: created }));
      setActiveId(created.id);
      const firstId = created.taskIds[created.lastPosition];
      navigate("tasks", {
        ...catalogRoute(selection),
        taskIndex: tasks.findIndex((task) => task.id === firstId),
        taskId: firstId,
        sessionId: created.id,
      });
    },
    [navigate, setExam, sessions, activeId, nextVisit, tasks],
  );

  const move = useCallback(
    (offset: -1 | 1) => {
      if (!session) return;
      const nextId = session.taskIds[position + offset];
      if (!nextId) return;
      navigate("tasks", {
        ...catalogRoute(session.selection),
        taskIndex: tasks.findIndex((task) => task.id === nextId),
        taskId: nextId,
        sessionId: session.id,
      });
    },
    [navigate, session, position, tasks],
  );

  const changeTask = useCallback(
    (value: PracticeTaskState) => {
      if (!session || !currentTask) return;
      setTaskStates((previous) => ({
        ...previous,
        [currentTask.id]: { ...value, solutionViewed: Boolean(value.solutionViewed || previous[currentTask.id]?.solutionViewed) },
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

  const resumeSelection = normalizeCatalogSelection({ ...catalog, exam,
    level: catalog.exam === exam ? catalog.level : undefined });
  const resumeSession = findRecentPracticeSession(sessions, resumeSelection, false, activeId);
  const resumeTaskId = resumeSession ? getSessionTaskId(resumeSession) : undefined;
  const resumeTask = resumeTaskId ? tasks.find((task) => task.id === resumeTaskId) : undefined;
  const resumeTarget = resumeSession && resumeTask ? { task: resumeTask, selection: resumeSession.selection } : null;
  const resume = useCallback(() => {
    if (!resumeSession || !resumeTask) return false;
    navigate("tasks", {
      ...catalogRoute(resumeSession.selection), taskId: resumeTask.id,
      taskIndex: tasks.findIndex((task) => task.id === resumeTask.id), sessionId: resumeSession.id,
    });
    return true;
  }, [resumeSession, resumeTask, navigate, tasks]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(practiceStorageKey);
      canPersist.current = true;
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
      return false;
    }
    latest.current = {
      version: 2,
      catalog: defaultCatalogSelection(),
      sessions: {},
      activeId: null,
      taskStates: {},
    };
    setSessions({});
    setTaskStates({});
    setActiveId(null);
    setCatalog(defaultCatalogSelection());
    return true;
  }, []);
  const dismissStorageWarning = useCallback(() => setStorageWarning(false), []);

  return {
    catalog,
    initialized: initialized && ready,
    contentError: packages.error || packageError,
    storageWarning,
    dismissStorageWarning,
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
    resumeTarget,
    reset,
  };
}
