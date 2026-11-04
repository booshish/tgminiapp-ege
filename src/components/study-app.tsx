"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  BadgePlus,
  Bookmark,
  CircleX,
  ClipboardCheck,
  House,
  Focus,
  Coffee,
  ListChecks,
  Menu,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@/components/ui";
import { TaskScreen } from "@/components/task-screen";
import { HomeScreen } from "@/components/screens/home-screen";
import { CatalogScreen } from "@/components/screens/catalog-screen";
import { TheoryScreen } from "@/components/screens/theory-screen";
import { TrainerScreen } from "@/components/screens/trainer-screen";
import { ProgressScreen } from "@/components/screens/progress-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { PremiumScreen } from "@/components/screens/premium-screen";
import { HelpScreen } from "@/components/screens/help-screen";
import { StudyToolsScreen } from "@/components/screens/study-tools-screen";
import { MockExamScreen } from "@/components/screens/mock-exam-screen";
import { useStudyTools } from "@/hooks/use-study-tools";
import { useMockExam } from "@/hooks/use-mock-exam";
import { clearMockStorage } from "@/lib/mock-exam";
import { useDemoProgress } from "@/hooks/use-demo-progress";
import { useStudyNavigation } from "@/hooks/use-study-navigation";
import { useTaskPackages } from "@/hooks/use-task-packages";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { taxonomyFilterKeys } from "@/lib/task-taxonomy";
import { useCatalogScroll } from "@/hooks/use-catalog-scroll";
import { useBreakReminder } from "@/hooks/use-break-reminder";
import {
  captureViewportPosition,
  restoreViewportPosition,
  type ViewportPosition,
} from "@/lib/viewport-position";
import {
  saveHelpOrigin,
  loadHelpOrigin,
  clearHelpOrigin,
} from "@/lib/help-navigation";
import { getPracticeBankView, taskTopicLabels } from "@/lib/tasks";
import { subjectTitle, isActiveSubject } from "@/lib/subjects";
import { getTaskXPScoringRule } from "@/lib/exam-scores";
import {
  catalogListKey,
  emptyTaskState,
  practiceTaskIds,
  type CatalogSelection,
} from "@/lib/practice";
import { historicalExamDefinitions as examDefinitions, getExamDefinition, getExamLevelLabel, type ExamLevel } from "@/lib/exams";
import { getTheoryTopic } from "@/lib/theory";
import { viewTitles, type View } from "@/lib/navigation";
import { getGameSummary, getSelfAssessment } from "@/lib/gamification";
import "./appearance.css";
import "./learning-features.css";
import "./workspace-layout.css";
import { restoredSidebar, showPlusOffer, type SidebarMode } from "@/lib/navigation-layout";
import "./navigation-release.css";

const navigation: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Главная", icon: House },
  { view: "theory", label: "Теория", icon: BookOpen },
  { view: "catalog", label: "Задания", icon: ListChecks },
  { view: "progress", label: "Прогресс", icon: TrendingUp },
  { view: "trainer", label: "Мой тренер", icon: Sparkles },
  { view: "profile", label: "Профиль", icon: UserRound },
  { view: "favorites", label: "Избранное", icon: Bookmark },
  { view: "mistakes", label: "Мои ошибки", icon: CircleX },
  { view: "mock", label: "Учебный вариант", icon: ClipboardCheck },
];
const desktopNavigation = [
  { ...navigation[2], group: "Учёба" }, navigation[1],
  { view: "favorites" as const, label: "Конспекты", icon: NotebookPen, bookmarkKind: "theory" as const },
  { ...navigation[4], group: "Развитие" }, navigation[7],
  { ...navigation[5], group: "Аккаунт" },
];
// Restore the original bottom-tab order, replacing only Home with Plus.
const mobileNavigation = [navigation[1], navigation[2], navigation[3], { view: "premium" as const, label: "Плюс", icon: BadgePlus }];
const mobileMoreNavigation = [navigation[7], navigation[6], navigation[8], navigation[5], navigation[4]];
const demoAllowed = process.env.NEXT_PUBLIC_ENABLE_PREMIUM_DEMO === "true";

export function StudyApp() {
  const tasks=getPracticeBankView();
  const phoneLayout = usePhoneLayout("navigation");
  const { route, navigate, back } = useStudyNavigation();
  const bootstrapPackages = useTaskPackages(route, true);
  const {
    state,
    ready,
    storageWarning,
    dismissStorageWarning,
    setExam,
    setFontScale,
    setTheme,
    setFocusMode,
    setBreakReminderMinutes,
    recordAnswer,
    confirmSelfAssessment,
    recordSolutionViewed,
    recordSolutionExposed,
    clearLocalData,
  } = useDemoProgress(bootstrapPackages.ready);
  const mock = useMockExam({
    onAnswer: recordAnswer,
    onSelfAssessment: (task, score) => confirmSelfAssessment(task, score, true),
    onSolutionViewed: (task, attemptId, sessionId) => {
      if (attemptId) recordSolutionViewed(task, attemptId, true);
      else recordSolutionExposed(task, sessionId);
    },
  }, ready);
  const [demoPremium, setDemoPremium] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const game = getGameSummary(state.game, now);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const closeMoreMenu = useCallback(() => {
    const wasOpen = menuDialog.current?.open;
    if (wasOpen) menuDialog.current?.close();
    setMoreOpen(false);
    if (wasOpen) document.querySelector<HTMLButtonElement>('.mobile-nav button[aria-controls="mobile-menu"]')?.focus({ preventScroll: true });
  }, []);
  const showMoreMenu = useCallback(() => {
    if (menuDialog.current && !menuDialog.current.open) menuDialog.current.show();
    setMoreOpen(true);
  }, []);
  const catalogRef = useRef<HTMLDivElement>(null);
  const helpReturn = useRef<{
    hash: string;
    position: ViewportPosition;
  } | null>(null);
  const focusPosition = useRef<ViewportPosition | null>(null);
  const previousView = useRef(route.view);
  const requestedMockSession = useRef<string | null>(null);
  const practice = usePracticeSession({
    route,
    navigate,
    ready,
    exam: state.exam,
    setExam,
  });
  const studyTools = useStudyTools(practice.initialized);
  const catalogScroll = useCatalogScroll({
    visible: route.view === "catalog",
    listKey: catalogListKey(practice.catalog),
    ready: ready && practice.initialized,
    rootRef: catalogRef,
  });
  const isPremium = demoAllowed && demoPremium;
  const routeTheory = route.topicId ? getTheoryTopic(route.topicId) : undefined;
  const theoryExam = route.exam ?? (routeTheory?.examType.length === 1 ? routeTheory.examType[0] : state.exam);
  const theoryLevel = route.level ?? routeTheory?.level ?? practice.catalog.level ?? "profile";
  const theorySubject = route.subjectId ?? routeTheory?.subjectId ?? practice.catalog.subjectId;
  const { initialized: practiceInitialized, catalog: practiceCatalog, changeCatalog: changePracticeCatalog } = practice;
  const canConcentrate = route.view === "tasks"
    || (route.view === "theory" && Boolean(route.topicId));
  const concentrating = state.focusMode && canConcentrate;
  const offerVisible = ready && sidebarReady && showPlusOffer(isPremium, route.view, concentrating, offerDismissed, editing, phoneLayout);
  const reserveOfferDuringEdit = editing && showPlusOffer(isPremium, route.view, concentrating, offerDismissed, false, phoneLayout);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    const viewport = window.visualViewport;
    const update = () => {
      if (phoneLayout && viewport && viewport.scale === 1) shell?.style.setProperty("--phone-visible-height", `${viewport.height}px`);
      else shell?.style.removeProperty("--phone-visible-height");
    };
    update();
    viewport?.addEventListener("resize", update);
    return () => { viewport?.removeEventListener("resize", update); shell?.style.removeProperty("--phone-visible-height"); };
  }, [phoneLayout]);
  useEffect(() => {
    const update = () => setEditing(document.activeElement instanceof HTMLElement &&
      document.activeElement.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]'));
    const out = () => queueMicrotask(update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", out);
    return () => { document.removeEventListener("focusin", update); document.removeEventListener("focusout", out); };
  }, []);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    const header = document.querySelector<HTMLElement>(".topbar");
    const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
    const measure = () => {
      shell?.style.setProperty("--navigation-header-height", `${header?.getBoundingClientRect().height ?? 82}px`);
      shell?.style.setProperty("--phone-nav-height", `${mobileNav?.getBoundingClientRect().height ?? 0}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    if (mobileNav) observer.observe(mobileNav);
    return () => observer.disconnect();
  }, [offerVisible, reserveOfferDuringEdit, phoneLayout, concentrating, ready]);
  const activeView = route.view === "tasks" || route.view === "mock" || (route.view === "favorites" && route.bookmarkKind === "task") ? "catalog" : route.view === "review" ? "trainer" : route.view;
  const { currentTask, session } = practice;
  const openMockAttempt = mock.open;
  const currentIndex = currentTask
    ? tasks.findIndex((task) => task.id === currentTask.id)
    : 0;
  const pageKey =
    route.view === "catalog"
      ? "catalog"
      : `${route.view}:${currentIndex}:${route.topicId ?? ""}:${route.materialId ?? ""}`;
  const latestCheck = [...state.events]
    .reverse()
    .find((event) => event.kind !== "solution_viewed");
  const reminder = useBreakReminder({
    minutes: state.breakReminderMinutes,
    safePointKey: `${pageKey}:${latestCheck?.id ?? ""}`,
    ready,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tochka-sidebar-v1");
      setSidebarMode(restoredSidebar(saved));
      setOfferDismissed(sessionStorage.getItem("tochka-plus-dismissed-v1") === "true");
    } catch { /* Navigation remains usable without browser storage. */ }
    setSidebarReady(true);
  }, []);
  useEffect(() => {
    if (!sidebarReady) return;
    try { localStorage.setItem("tochka-sidebar-v1", sidebarMode); } catch { /* Keep the in-memory preference. */ }
  }, [sidebarMode, sidebarReady]);

  useEffect(() => {
    if (ready && practiceInitialized && route.view === "theory" && (state.exam !== theoryExam || practiceCatalog.subjectId !== theorySubject)) {
      changePracticeCatalog({ ...practiceCatalog, exam: theoryExam, subjectId: theorySubject,
        level: theorySubject === "math" && theoryExam === "ЕГЭ" ? theoryLevel : undefined,
        examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
    }
  }, [ready, practiceInitialized, route.view, state.exam, theoryExam, theorySubject, theoryLevel, practiceCatalog, changePracticeCatalog]);

  useEffect(() => {
    if (route.view !== "mock" || !route.sessionId) {
      requestedMockSession.current = null;
      return;
    }
    if (!mock.ready || route.invalidContext || requestedMockSession.current === route.sessionId) return;
    requestedMockSession.current = route.sessionId;
    openMockAttempt(route.sessionId);
  }, [mock.ready, openMockAttempt, route.invalidContext, route.sessionId, route.view]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = state.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        state.theme === "dark" ? "#1d2420" : "#f7f8f4",
      );
  }, [state.theme, ready]);
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // History/query changes and phone/tablet transitions can bypass open(view).
  // Close the drawer on navigation, breakpoint changes, or concentration.
  useLayoutEffect(() => {
    closeMoreMenu();
  }, [route, phoneLayout, concentrating, closeMoreMenu]);

  useLayoutEffect(() => {
    if (!moreOpen || !phoneLayout) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMoreMenu(); }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [moreOpen, phoneLayout, closeMoreMenu]);

  useLayoutEffect(() => {
    if (!ready) return;
    const returningFromHelp =
      previousView.current === "help" && route.view !== "help";
    previousView.current = route.view;
    const helpOrigin = returningFromHelp
      ? helpReturn.current ?? loadHelpOrigin()
      : null;
    if (helpOrigin && helpOrigin.hash === window.location.hash) {
      restoreViewportPosition(helpOrigin.position);
    } else if (route.view !== "catalog") {
      document.getElementById("practice-content")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
      for (
        let container: HTMLElement | null =
          document.getElementById("main-content");
        container;
        container = container.parentElement
      ) {
        if (container.scrollTop || container.scrollLeft) {
          container.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      }
    }
    if (returningFromHelp) {
      helpReturn.current = null;
      clearHelpOrigin();
    }
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pageKey, ready, route.view]);
  useLayoutEffect(() => {
    if (!focusPosition.current) return;
    restoreViewportPosition(focusPosition.current);
    focusPosition.current = null;
  }, [state.focusMode]);
  function open(view: View) {
    if (route.view === "catalog") catalogScroll.capture();
    // Remove the modal's inert state before the next screen receives focus.
    closeMoreMenu();
    if (view === "catalog") {
      practice.openCatalog();
    }
    else if (view === "theory") openTheory();
    else if (view === "mock" && practice.catalog.subjectId !== "math") navigate(view, { exam: state.exam, subjectId: practice.catalog.subjectId });
    else navigate(view);
  }
  function startPractice(topicId?: string, prototypeId?: string) {
    if (route.view === "catalog") catalogScroll.capture();
    const topic = topicId ? getTheoryTopic(topicId) : undefined;
    const exam = route.view === "theory" ? theoryExam : topic && !topic.examType.includes(state.exam) ? topic.examType[0] : state.exam;
    practice.start({
      ...practice.catalog,
      exam,
      subjectId: topic?.subjectId ?? (route.view === "theory" ? theorySubject : practice.catalog.subjectId),
      level: (topic?.subjectId ?? (route.view === "theory" ? theorySubject : practice.catalog.subjectId)) === "math" && exam === "ЕГЭ" ? topic?.level ?? (route.view === "theory" ? theoryLevel : practice.catalog.level ?? "profile") : undefined,
      mode: "topic",
      examNumber: undefined,
      topicId,
      prototypeId,
      part: undefined,
    });
  }
  function continuePractice() {
    if (practice.resume()) return;
    practice.openCatalog();
  }
  function startFromCatalog(selection: CatalogSelection) {
    catalogScroll.capture();
    practice.start(selection);
  }
  function startVariant(variantNumber: number, replace: boolean) {
    const selection = practice.catalog;
    const definition = getExamDefinition({ examType: selection.exam, subjectId: selection.subjectId, level: selection.level });
    if (!definition) return;
    catalogScroll.capture();
    mock.start(definition, variantNumber, { replace });
    navigate("mock", { exam: selection.exam, subjectId: selection.subjectId, level: selection.level });
  }
  function resumeVariant(sessionId: string) {
    const attempt = mock.state.sessions.find((entry) => entry.id === sessionId);
    const definition = attempt && examDefinitions.find((entry) => entry.versionId === attempt.examVersionId);
    if (!definition) return;
    catalogScroll.capture();
    practice.changeCatalog({ ...practice.catalog, exam: definition.examType, level: definition.level ?? undefined, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
    mock.open(sessionId);
    navigate("mock", { exam: definition.examType, subjectId: definition.subjectId, level: definition.level ?? undefined, sessionId });
  }
  function changeMockSelection(exam: CatalogSelection["exam"], level?: ExamLevel) {
    practice.changeCatalog({ ...practice.catalog, exam, level: exam === "ЕГЭ" ? level ?? "profile" : undefined, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
    navigate("mock", { exam, subjectId: "math", level: exam === "ЕГЭ" ? level ?? "profile" : undefined });
  }
  function shufflePractice() {
    catalogScroll.capture();
    practice.start({ ...practice.catalog, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined },
      undefined, state.events.map((event) => event.taskId));
  }
  function openTaskById(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !getExamDefinition({ examType: task.examType[0], subjectId: task.subjectId, level: task.level })?.available) return;
    practice.start({
      exam: task.examType[0], subjectId: task.subjectId, level: task.level ?? undefined,
      mode: task.examNumber === null ? "topic" : "number",
      examNumber: task.examNumber ?? undefined,
      topicId: task.examNumber === null ? task.topicId : undefined,
      part: task.part ?? undefined,
    }, task.id);
  }
  const openPremium = () => open("premium");
  const openTheory = (topicId?: string) => {
    if (route.view === "catalog") catalogScroll.capture();
    const topic = topicId ? getTheoryTopic(topicId) : undefined;
    if (topic && !topic.examType.includes(state.exam)) practice.changeExam(topic.examType[0]);
    const exam = topic && !topic.examType.includes(state.exam) ? topic.examType[0] : state.exam;
    navigate("theory", { topicId: topic?.id ?? topicId, exam,
      subjectId: topic?.subjectId ?? practice.catalog.subjectId,
      level: (topic?.subjectId ?? practice.catalog.subjectId) === "math" && exam === "ЕГЭ" ? topic?.level ?? practice.catalog.level ?? "profile" : undefined });
  };
  function openMockTheory(topicId: string) {
    const definition = examDefinitions.find((entry) => entry.versionId === mock.active?.examVersionId);
    if (!definition) { openTheory(topicId); return; }
    practice.changeCatalog({ ...practice.catalog, exam: definition.examType, level: definition.level ?? undefined, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
    navigate("theory", { topicId, exam: definition.examType, level: definition.level ?? undefined });
  }
  function openHelp() {
    if (route.view === "help") {
      closeMoreMenu();
      return;
    }
    helpReturn.current = {
      hash: window.location.hash,
      position: captureViewportPosition(),
    };
    saveHelpOrigin(helpReturn.current);
    open("help");
  }
  function returnFromHelp() {
    const origin = helpReturn.current ?? loadHelpOrigin();
    if (Number(window.history.state?.tochkaDepth) > 0 || !origin) {
      back();
      return;
    }
    // A reload starts a new router depth; retain the actual origin instead of going home.
    helpReturn.current = origin;
    window.history.replaceState(
      { ...window.history.state, tochkaDepth: 0 },
      "",
      origin.hash || `${window.location.pathname}${window.location.search}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  function toggleConcentration() {
    focusPosition.current = captureViewportPosition();
    setFocusMode(!state.focusMode);
  }

  const linkedTask = route.taskId ? tasks.find(task => task.id === route.taskId) : undefined;
  const linkedTopic = route.topicId ? getTheoryTopic(route.topicId) : undefined;
  const selectedExam = route.exam ?? linkedTask?.examType[0] ?? linkedTopic?.examType[0] ?? state.exam;
  const selectedSubject = route.subjectId ?? linkedTask?.subjectId ?? linkedTopic?.subjectId ?? practice.catalog.subjectId;
  if (!isActiveSubject(selectedExam, selectedSubject)
    || (route.view === "tasks" && currentTask && !isActiveSubject(currentTask.examType[0], currentTask.subjectId))
    || (linkedTask && !isActiveSubject(linkedTask.examType[0], linkedTask.subjectId))
    || (linkedTopic && !isActiveSubject(selectedExam, linkedTopic.subjectId))) return (
    <main className="empty-state">
      <Brand />
      <h1>Направление временно недоступно</h1>
      <p>Материалы, история, закладки и подписка сохранены. Выбери доступное направление подготовки.</p>
      <button className="button button-primary" onClick={() => {
        practice.changeCatalog({exam: selectedExam, subjectId: "math", mode: "number", ...(selectedExam === "ЕГЭ" ? {level: "profile" as const} : {})});
        navigate("catalog", {exam: selectedExam, subjectId: "math", level: selectedExam === "ЕГЭ" ? "profile" : undefined});
      }}>Выбрать направление</button>
    </main>
  );
  const navLinks = desktopNavigation.map((item) => {
    const { view, label, icon: Icon } = item;
    const bookmarkKind = "bookmarkKind" in item ? item.bookmarkKind : undefined;
    const active = activeView === view && (view !== "favorites" || route.bookmarkKind === "theory");
    return <Fragment key={view}>
      {"group" in item && <h2 className="nav-group-label">{item.group}</h2>}
      <button type="button" aria-label={label} className={active ? "active" : ""} aria-current={active ? "page" : undefined}
        onClick={() => { closeMoreMenu(); if (bookmarkKind) navigate("favorites", { bookmarkKind }); else open(view); }}>
        <Icon size={21} aria-hidden="true"/><span className="desktop-nav-label">{label}</span>
      </button>
    </Fragment>;
  });
  return (
    <div
      className={`app-shell font-${state.fontScale}${concentrating ? " focus-mode" : ""}`}
      data-view={route.view}
      data-navigation-layout={phoneLayout ? "phone" : "wide"}
      data-more-open={moreOpen && phoneLayout}
      data-sidebar={sidebarMode}
      data-can-concentrate={canConcentrate}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <aside className="sidebar" id="desktop-sidebar" aria-label="Разделы сайта">
        <button
          className="brand-button"
          onClick={() => open("home")}
          aria-label="Перейти на главную" title="На главную"
        >
          <Brand />
        </button>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navLinks}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar" inert={moreOpen && phoneLayout}>
          <div className="desktop-menu-controls">
            <button type="button" className="icon-button" aria-controls={phoneLayout ? "mobile-menu" : "desktop-sidebar"}
              aria-expanded={phoneLayout ? moreOpen : sidebarMode === "expanded"}
              aria-label="Меню" title="Открыть или скрыть меню"
              onClick={() => phoneLayout ? (moreOpen ? closeMoreMenu() : showMoreMenu()) : setSidebarMode(value => value === "expanded" ? "hidden" : "expanded")}>
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
          <button
            className="mobile-brand brand-button"
            onClick={() => open("home")}
            aria-label="Перейти на главную" title="На главную"
          >
            <Brand />
          </button>
          <span className="desktop-breadcrumb">{viewTitles[route.view]}</span>
          <div className="topbar-right">
            <span className="course-label">{state.exam} · {subjectTitle(practice.catalog.subjectId)}</span>
            <button
              className="avatar"
              onClick={() => open("profile")}
              aria-label="Открыть профиль"
            >
              <UserRound size={22} />
            </button>
          </div>
          {canConcentrate && !(concentrating && route.view === "tasks" && session && !session.invalidContext) && (
            <button
              type="button"
              className="focus-toggle"
              aria-pressed={concentrating}
              aria-label={
                concentrating
                  ? "Выйти из режима концентрации"
                  : "Фокус: включить режим концентрации"
              }
              title={concentrating ? "Выйти из режима концентрации" : "Режим концентрации"}
              onClick={toggleConcentration}
            >
              {concentrating ? (
                <X size={21} aria-hidden="true" />
              ) : (
                <Focus size={21} aria-hidden="true" />
              )}
              <span>{concentrating ? "Выйти" : "Фокус"}</span>
            </button>
          )}
        </header>
        <main
          inert={moreOpen && phoneLayout}
          id="main-content"
          aria-busy={!ready || !practice.initialized}
          tabIndex={-1}
          className={`main-content view-${route.view}`}
        >
          {(bootstrapPackages.error || practice.contentError) && <p role="alert">{bootstrapPackages.error || practice.contentError}</p>}
          {demoAllowed && (
            <div className="developer-notice" role="note">
              <ShieldCheck size={20} />
              <span>
                Режим разработки ·{" "}
                {isPremium ? "Демонстрационный Плюс" : "Free"}. Серверной
                проверки подписки нет. Переключение — в профиле.
              </span>
            </div>
          )}
          {(storageWarning ||
            practice.storageWarning ||
            catalogScroll.storageWarning) && (
            <div className="storage-warning" role="status">
              <ShieldCheck size={20} />
              <span>
                Не удалось полностью сохранить или восстановить данные этого браузера.
                После закрытия страницы последние изменения могут быть потеряны.
              </span>
              <button
                onClick={() => {
                  dismissStorageWarning();
                  practice.dismissStorageWarning();
                  catalogScroll.dismissStorageWarning();
                }}
                aria-label="Закрыть уведомление"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {route.view === "home" && (
            <HomeScreen
              exam={state.exam}
              subjectId={practice.catalog.subjectId}
              onSubjectChange={(subjectId) => practice.changeCatalog({ ...practice.catalog, subjectId, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined })}
              onExamChange={(exam) => practice.changeCatalog({ ...practice.catalog, exam,
                subjectId: exam === "ОГЭ" && practice.catalog.subjectId === "chinese" ? "math" : practice.catalog.subjectId,
                level: exam === "ЕГЭ" && practice.catalog.subjectId === "math" ? practice.catalog.level ?? "profile" : undefined,
                examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined })}
              onStart={continuePractice}
              onNavigate={open}
              game={game}
              onHelp={openHelp}
              resumeLabel={practice.resumeTarget ? [
                practice.resumeTarget.selection.exam,
                subjectTitle(practice.resumeTarget.task.subjectId),
                practice.resumeTarget.task.examNumber ? `№${practice.resumeTarget.task.examNumber}` : "Базовая практика",
                practice.resumeTarget.task.title,
              ].join(" · ") : undefined}
            />
          )}
          {studyTools.storageWarning && route.view !== "favorites" && (
            <p className="storage-warning" role="status">Не удалось сохранить закладки в браузере. Они могут быть потеряны после закрытия страницы.</p>
          )}
          <div
            ref={catalogRef}
            hidden={route.view !== "catalog" || !practice.initialized}
          >
            <CatalogScreen
              selection={practice.catalog}
              onChange={practice.changeCatalog}
              onStart={startFromCatalog}
              onTheory={openTheory}
              onShuffle={shufflePractice}
              mockState={mock.state}
              mockReady={mock.ready}
              onVariant={startVariant}
              onResumeVariant={resumeVariant}
              onOpenVariants={() => { catalogScroll.capture(); mock.open(null); navigate("mock", { exam: practice.catalog.exam, subjectId: practice.catalog.subjectId, level: practice.catalog.level }); }}
              onMistakes={() => open("mistakes")}
              onSaved={() => navigate("favorites", { bookmarkKind: "task" })}
              onContinue={practice.resumeTarget ? continuePractice : undefined}
              resumeLabel={practice.resumeTarget ? `№${practice.resumeTarget.task.examNumber ?? "—"} · ${practice.resumeTarget.task.title}` : undefined}
              game={game}
            />
          </div>
          {route.view === "theory" && (
            <TheoryScreen
              exam={theoryExam}
              subjectId={theorySubject}
              onSubjectChange={(subjectId) => {
                practice.changeCatalog({ ...practice.catalog, exam: theoryExam, subjectId, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
                navigate("theory", { exam: theoryExam, subjectId, level: subjectId === "math" && theoryExam === "ЕГЭ" ? theoryLevel : undefined });
              }}
              level={theoryLevel}
              focusMode={concentrating}
              topicId={route.topicId}
              materialId={route.materialId}
              onBrowse={() => navigate("theory", {exam:theoryExam,subjectId:theorySubject,level:theorySubject === "math" && theoryExam === "ЕГЭ" ? theoryLevel : undefined})}
              bookmarked={Boolean(route.topicId && studyTools.isBookmarked("theory", getTheoryTopic(route.topicId)?.id ?? route.topicId))}
              onBookmark={route.topicId && studyTools.ready ? () => studyTools.toggleBookmark({
                kind: "theory", itemId: getTheoryTopic(route.topicId!)?.id ?? route.topicId!, examType: theoryExam,
              }) : undefined}
              onExamChange={(exam) => { const subjectId = exam === "ОГЭ" && theorySubject === "chinese" ? "math" : theorySubject; practice.changeExam(exam); navigate("theory", { exam, subjectId, level: subjectId === "math" && exam === "ЕГЭ" ? theoryLevel : undefined }); }}
              onLevelChange={(level) => {
                practice.changeCatalog({ ...practice.catalog, exam: "ЕГЭ", level, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined });
                navigate("theory", { exam: "ЕГЭ", level });
              }}
              onOpenTopic={(topicId) => navigate("theory", { topicId, exam: theoryExam, subjectId: getTheoryTopic(topicId)?.subjectId ?? theorySubject, level: (getTheoryTopic(topicId)?.subjectId ?? theorySubject) === "math" && theoryExam === "ЕГЭ" ? getTheoryTopic(topicId)?.level ?? theoryLevel : undefined })}
              onOpenMaterial={(topicId, materialId) =>
                navigate("theory", { topicId, materialId, exam: theoryExam, subjectId: getTheoryTopic(topicId)?.subjectId ?? theorySubject, level: (getTheoryTopic(topicId)?.subjectId ?? theorySubject) === "math" && theoryExam === "ЕГЭ" ? getTheoryTopic(topicId)?.level ?? theoryLevel : undefined })
              }
              onPractice={startPractice}
              onBack={() => {
                if (route.topicId) {
                  navigate(
                    "theory",
                    route.materialId ? { topicId: route.topicId, exam: theoryExam, subjectId: theorySubject, level: theorySubject === "math" && theoryExam === "ЕГЭ" ? theoryLevel : undefined } : { exam: theoryExam, subjectId: theorySubject, level: theorySubject === "math" && theoryExam === "ЕГЭ" ? theoryLevel : undefined },
                  );
                } else back();
              }}
            />
          )}
          {route.view === "tasks" &&
            (!session ? (
              <section className="empty-state" role="status">
                <h1>Открываем подборку</h1>
              </section>
            ) : !session.invalidContext ? (
              <PracticeWorkspace selection={session.selection} taskIds={session.taskIds} task={currentTask}
                focusExit={concentrating ? <button type="button" className="focus-toggle practice-focus-exit" aria-label="Выйти из режима концентрации" aria-pressed="true" onClick={toggleConcentration}><X size={21} aria-hidden="true"/><span>Выйти</span></button> : undefined}
                drafts={session.states} learning={state} historical={session.historicalContext}
                onApply={selected=>practice.start(selected,practiceTaskIds(selected)[0])} onOpenTask={practice.openTask} onBack={practice.returnToCatalog}>
              {nav=>currentTask?<TaskScreen
                key={`${session.id}:${currentTask.id}`}
                task={currentTask}
                bookmarked={studyTools.isBookmarked("task", currentTask.id)}
                onBookmark={studyTools.ready ? () => studyTools.toggleBookmark({
                  kind: "task", itemId: currentTask.id, examType: currentTask.examType[0],
                }) : undefined}
                exam={session.selection.exam}
                levelLabel={
                  session.selection.exam === "ЕГЭ" && currentTask.subjectId === "math"
                    ? getExamLevelLabel(session.selection.level)
                    : undefined
                }
                examNumber={currentTask.examNumber}
                topicTitle={
                  getTheoryTopic(currentTask.activeTheoryTopicId ?? currentTask.topicId)
                    ?.title ??
                  taskTopicLabels[currentTask.topicId] ??
                  currentTask.title
                }
                value={session.states[currentTask.id] ?? emptyTaskState()}
                onChange={practice.changeTask}
                onAnswer={recordAnswer}
                maxPrimaryScore={
                  getTaskXPScoringRule(currentTask)?.maxPrimaryScore ?? null
                }
                selfAssessment={getSelfAssessment(state.game, currentTask.id)}
                onSelfAssessment={confirmSelfAssessment}
                onSolutionViewed={recordSolutionViewed}
                focusMode={concentrating}
                {...nav}
                onBack={practice.returnToCatalog}
              />:null}
              </PracticeWorkspace>
            ) : (
              <section className="empty-state">
                <h1>
                  {session.invalidContext
                    ? "Подборка недоступна"
                    : taxonomyFilterKeys.some(key=>session.selection[key]) ? "По выбранным фильтрам заданий нет" : "Задания скоро появятся"}
                </h1>
                {!session.invalidContext && (
                  <p>
                    {session.selection.exam} · {subjectTitle(session.selection.subjectId)}
                    {session.selection.level
                      ? ` · ${getExamLevelLabel(session.selection.level)}`
                      : ""}
                    {session.selection.examNumber
                      ? ` · Задание №${session.selection.examNumber}`
                      : ""}
                  </p>
                )}
                <p>
                  {session.invalidContext
                    ? "В ссылке указан неподдерживаемый экзамен, предмет или уровень. Выбери доступную подборку в каталоге."
                    : "Выбери «Все темы» или сбрось фильтры, чтобы вернуться к общему банку этого номера."}
                </p>
                <button
                  className="button button-primary"
                  onClick={practice.returnToCatalog}
                >
                  К выбору заданий
                </button>
              </section>
            ))}
          {route.view === "progress" && (
            <ProgressScreen
              state={state}
              isPremium={isPremium}
              onPremium={openPremium}
              onStart={startPractice}
              game={game}
            />
          )}
          {(route.view === "trainer" || route.view === "review") && <nav className="trainer-section-nav" aria-label="Мой тренер">
            <button type="button" className={route.view === "trainer" ? "selected" : ""} aria-current={route.view === "trainer" ? "page" : undefined} onClick={() => open("trainer")}>Обзор тренера</button>
            <button type="button" className={route.view === "review" ? "selected" : ""} aria-current={route.view === "review" ? "page" : undefined} onClick={() => open("review")}>Повторение</button>
          </nav>}
          {route.view === "trainer" && (
            <TrainerScreen
              state={state}
              isPremium={isPremium}
              onPremium={openPremium}
              onTheory={openTheory}
              onStart={startPractice}
              onReview={() => open("review")}
            />
          )}
          {route.view === "profile" && (
            <ProfileScreen
              state={state}
              isPremium={isPremium}
              demoAllowed={demoAllowed}
              onToggleDemo={() => setDemoPremium((value) => !value)}
              onExamChange={practice.changeExam}
              onFontScale={setFontScale}
              onThemeChange={setTheme}
              onFocusModeChange={setFocusMode}
              onBreakReminderChange={setBreakReminderMinutes}
              onHelp={openHelp}
              onClear={() => {
                const practiceCleared = practice.reset();
                const scrollCleared = catalogScroll.reset();
                const bookmarksCleared = studyTools.clearBookmarks();
                const mocksCleared = clearMockStorage();
                if (mocksCleared) mock.reset();
                const success =
                  clearLocalData() && practiceCleared && scrollCleared && bookmarksCleared && mocksCleared;
                if (success) {
                  setDemoPremium(false);
                  reminder.reset();
                }
                return success;
              }}
              onPremium={openPremium}
            />
          )}
          {route.view === "premium" && (isPremium ? <section className="settings-card">
            <h1>Точка Плюс</h1><p>Инструменты Плюса доступны. Информация о подписке находится в профиле.</p>
            <button type="button" className="button button-secondary" onClick={() => open("profile")}>Подписка «Плюс» в профиле</button>
          </section> : <PremiumScreen onBack={back} onProfile={() => open("profile")} />)}
          {route.view === "help" && <HelpScreen onBack={returnFromHelp} />}
          {(["favorites", "mistakes", "review"] as const).map((view) => route.view === view && (
            <StudyToolsScreen key={`${view}-${route.bookmarkKind ?? "all"}`} mode={view} bookmarkKind={route.bookmarkKind} events={state.events} tools={studyTools}
              isPremium={isPremium} onTask={openTaskById} onTheory={openTheory} onBrowseTheory={() => openTheory()} onPremium={openPremium} />
          ))}
          {route.view === "mock" && (route.invalidContext || (route.subjectId !== undefined && route.subjectId !== "math") ? (
            <section className="empty-state" role="status"><h1>Вариант недоступен</h1><p>В ссылке указан неподдерживаемый предмет, экзамен или уровень. Выбери доступный вариант в «Заданиях».</p><button type="button" className="button button-primary" onClick={() => practice.openCatalog()}>К заданиям</button></section>
          ) : (
            <MockExamScreen mock={mock} exam={route.exam ?? state.exam} level={route.level ?? practice.catalog.level}
              onSelectionChange={changeMockSelection} onBack={back} onOpenTheory={openMockTheory} />
          ))}
          {reminder.visible && (
            <aside
              className="break-reminder"
              role="status"
              aria-label="Напоминание о перерыве"
            >
              <Coffee size={22} aria-hidden="true" />
              <div>
                <strong>Можно сделать небольшой перерыв</strong>
                <p>Отдохни от экрана и разомнись. К заданию можно вернуться в любое время.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Закрыть напоминание"
                onClick={reminder.dismiss}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </aside>
          )}
        </main>
        {(offerVisible || reserveOfferDuringEdit) && <aside className="plus-dock" aria-label="Точка Плюс" aria-hidden={!offerVisible} inert={!offerVisible}>
          <strong>Точка Плюс</strong>
          <span className="plus-dock-copy">Тренер, аналитика и повторение ошибок</span>
          <span className="plus-dock-trial">7 дней бесплатно</span>
          <button type="button" className="button button-primary" onClick={openPremium}>Узнать больше</button>
          <button type="button" className="icon-button" aria-label="Скрыть предложение Плюса на эту сессию" onClick={() => {
            setOfferDismissed(true); try { sessionStorage.setItem("tochka-plus-dismissed-v1", "true"); } catch { /* In-memory dismissal still works. */ }
          }}><X size={18} aria-hidden="true"/></button>
        </aside>}
        <nav className="mobile-nav" aria-label="Нижняя навигация" onPointerDown={event => {
          // Do not let keyboard dismissal move the target between press and click.
          // Only click navigates; keyboard activation keeps its native behaviour.
          if (event.isPrimary && event.button === 0 && document.activeElement instanceof HTMLElement &&
            document.activeElement.matches('input,textarea,[contenteditable="true"]')) event.preventDefault();
        }}>
          {mobileNavigation.map(({ view, label, icon: Icon }) => {
            const active = activeView === view && route.view !== "mock";
            return <button key={view} type="button" className={active && !moreOpen ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => open(view)}>
              <Icon size={22} aria-hidden="true"/><span>{label}</span>
            </button>;
          })}
          <button type="button" className={moreOpen || ["trainer", "profile", "favorites", "mistakes", "help", "mock"].includes(activeView) || route.view === "mock" ? "active" : ""}
            aria-haspopup="dialog" aria-controls="mobile-menu" aria-expanded={moreOpen} onClick={() => moreOpen ? closeMoreMenu() : showMoreMenu()}>
            <Menu size={22} aria-hidden="true"/><span>Ещё</span>
          </button>
        </nav>
      </div>
      {moreOpen && phoneLayout && <button type="button" className="mobile-menu-backdrop" tabIndex={-1} aria-label="Закрыть меню" onClick={closeMoreMenu} />}
      <dialog
        id="mobile-menu"
        ref={menuDialog}
        className="navigation-dialog"
        aria-modal="false"
        aria-labelledby="menu-title"
        onClose={(event) => {
          // A queued close event may arrive after a quick reopen in Safari.
          if (!event.currentTarget.open) setMoreOpen(false);
        }}
        onCancel={(event) => { event.preventDefault(); closeMoreMenu(); }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeMoreMenu();
        }}
      >
        <div className="dialog-title">
          <h2 id="menu-title">Разделы</h2>
        </div>
        <nav aria-label="Дополнительные разделы">
          {mobileMoreNavigation.map(({ view, label, icon: Icon }) => <button key={view} type="button" aria-current={activeView === view ? "page" : undefined} onClick={() => open(view)}>
            <Icon size={23} aria-hidden="true"/><span>{label}</span>
          </button>)}
          <button type="button" onClick={openHelp}>Помощь и объяснения</button>
        </nav>
      </dialog>
    </div>
  );
}
