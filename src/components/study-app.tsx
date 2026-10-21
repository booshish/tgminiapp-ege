"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  CircleX,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  Grid2X2,
  House,
  Focus,
  CircleHelp,
  Coffee,
  ListChecks,
  Menu,
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
import { clearMockStorage } from "@/lib/mock-exam";
import { useDemoProgress } from "@/hooks/use-demo-progress";
import { useStudyNavigation } from "@/hooks/use-study-navigation";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { usePracticeSession } from "@/hooks/use-practice-session";
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
import { tasks, taskTopicLabels } from "@/lib/tasks";
import { getTaskXPScoringRule } from "@/lib/exam-scores";
import {
  catalogListKey,
  emptyTaskState,
  type CatalogSelection,
} from "@/lib/practice";
import { getExamLevelLabel } from "@/lib/exams";
import { getTheoryTopic } from "@/lib/theory";
import { viewTitles, type View } from "@/lib/navigation";
import { getGameSummary, getSelfAssessment } from "@/lib/gamification";
import "./appearance.css";
import "./learning-features.css";

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
  { view: "review", label: "Умное повторение", icon: CalendarClock },
];
const demoAllowed = process.env.NEXT_PUBLIC_ENABLE_PREMIUM_DEMO === "true";
const phoneMoreOrder: View[] = ["mistakes", "favorites", "mock", "profile", "trainer", "review"];

export function StudyApp() {
  const phoneLayout = usePhoneLayout();
  const moreNavigation = phoneLayout
    ? phoneMoreOrder.map((view) => navigation.find((item) => item.view === view)!)
    : navigation.slice(4);
  const { route, navigate, back } = useStudyNavigation();
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
  } = useDemoProgress();
  const studyTools = useStudyTools();
  const [demoPremium, setDemoPremium] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const game = getGameSummary(state.game, now);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const helpReturn = useRef<{
    hash: string;
    position: ViewportPosition;
  } | null>(null);
  const focusPosition = useRef<ViewportPosition | null>(null);
  const previousView = useRef(route.view);
  const practice = usePracticeSession({
    route,
    navigate,
    ready,
    exam: state.exam,
    setExam,
  });
  const catalogScroll = useCatalogScroll({
    visible: route.view === "catalog",
    listKey: catalogListKey(practice.catalog),
    ready: ready && practice.initialized,
    rootRef: catalogRef,
  });
  const isPremium = demoAllowed && demoPremium;
  const routeTheory = route.topicId ? getTheoryTopic(route.topicId) : undefined;
  const theoryExam = route.exam ?? (routeTheory?.examType.length === 1 ? routeTheory.examType[0] : state.exam);
  const canConcentrate = route.view === "tasks"
    || (route.view === "theory" && Boolean(route.topicId));
  const concentrating = state.focusMode && canConcentrate;
  const activeView = route.view === "tasks" ? "catalog" : route.view;
  const { currentTask, session } = practice;
  const changePracticeExam = practice.changeExam;
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
    if (ready && practice.initialized && route.view === "theory" && state.exam !== theoryExam) changePracticeExam(theoryExam);
  }, [ready, practice.initialized, route.view, state.exam, theoryExam, changePracticeExam]);

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
  useEffect(() => {
    const dialog = menuDialog.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  function open(view: View) {
    if (route.view === "catalog") catalogScroll.capture();
    // Remove the modal's inert state before the next screen receives focus.
    if (menuDialog.current?.open) menuDialog.current.close();
    setMoreOpen(false);
    if (view === "catalog") {
      // A return from another section resumes practice; tapping the active tab opens its catalog.
      if (route.view !== "catalog" && route.view !== "tasks" && practice.resume()) return;
      practice.openCatalog();
    }
    else navigate(view);
  }
  function startPractice(topicId?: string, prototypeId?: string) {
    if (route.view === "catalog") catalogScroll.capture();
    practice.start({
      ...practice.catalog,
      exam: state.exam,
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
  function shufflePractice() {
    catalogScroll.capture();
    practice.start({ ...practice.catalog, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined },
      undefined, state.events.map((event) => event.taskId));
  }
  function openTaskById(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.level === "base") return;
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
    navigate("theory", { topicId: topic?.id ?? topicId,
      exam: topic && !topic.examType.includes(state.exam) ? topic.examType[0] : state.exam });
  };
  function openHelp() {
    if (route.view === "help") {
      menuDialog.current?.close();
      setMoreOpen(false);
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

  return (
    <div
      className={`app-shell font-${state.fontScale}${concentrating ? " focus-mode" : ""}`}
      data-view={route.view}
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
      <aside className="sidebar">
        <button
          className="brand-button"
          onClick={() => open("home")}
          aria-label="Точка — главная"
        >
          <Brand />
        </button>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navigation.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              className={activeView === view ? "active" : ""}
              aria-current={activeView === view ? "page" : undefined}
              onClick={() => open(view)}
            >
              <Icon size={21} aria-hidden="true" />
              {label}
              {activeView === view && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-plan" onClick={openPremium}>
            <Sparkles size={21} />
            <span>
              <strong>{isPremium ? "Демо Premium" : "Free"}</strong>
              <small>Возможности тарифа</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-brand brand-button"
            onClick={() => open("home")}
            aria-label="Точка — главная"
          >
            <Brand />
          </button>
          <span className="desktop-breadcrumb">{viewTitles[route.view]}</span>
          <div className="topbar-right">
            <span className="course-label">{state.exam} · Математика</span>
            <button
              className="avatar"
              onClick={() => open("profile")}
              aria-label="Открыть профиль"
            >
              <UserRound size={22} />
            </button>
          </div>
          {canConcentrate && (
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
          id="main-content"
          aria-busy={!ready || !practice.initialized}
          tabIndex={-1}
          className={`main-content view-${route.view}`}
        >
          {demoAllowed && (
            <div className="developer-notice" role="note">
              <ShieldCheck size={20} />
              <span>
                Режим разработки ·{" "}
                {isPremium ? "Демонстрационный Premium" : "Free"}. Серверной
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
              onExamChange={practice.changeExam}
              onStart={continuePractice}
              onNavigate={open}
              game={game}
              onHelp={openHelp}
              resumeLabel={practice.resumeTarget ? [
                practice.resumeTarget.selection.exam,
                "Математика",
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
              game={game}
            />
          </div>
          {route.view === "theory" && (
            <TheoryScreen
              exam={theoryExam}
              focusMode={concentrating}
              topicId={route.topicId}
              materialId={route.materialId}
              bookmarked={Boolean(route.topicId && studyTools.isBookmarked("theory", getTheoryTopic(route.topicId)?.id ?? route.topicId))}
              onBookmark={route.topicId && studyTools.ready ? () => studyTools.toggleBookmark({
                kind: "theory", itemId: getTheoryTopic(route.topicId!)?.id ?? route.topicId!, examType: theoryExam,
              }) : undefined}
              onExamChange={(exam) => { practice.changeExam(exam); navigate("theory", { exam }); }}
              onOpenTopic={(topicId) => navigate("theory", { topicId, exam: theoryExam })}
              onOpenMaterial={(topicId, materialId) =>
                navigate("theory", { topicId, materialId, exam: theoryExam })
              }
              onPractice={startPractice}
              onBack={() => {
                if (route.topicId) {
                  navigate(
                    "theory",
                    route.materialId ? { topicId: route.topicId, exam: theoryExam } : { exam: theoryExam },
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
            ) : currentTask ? (
              <TaskScreen
                key={`${session.id}:${currentTask.id}`}
                task={currentTask}
                bookmarked={studyTools.isBookmarked("task", currentTask.id)}
                onBookmark={studyTools.ready ? () => studyTools.toggleBookmark({
                  kind: "task", itemId: currentTask.id, examType: currentTask.examType[0],
                }) : undefined}
                exam={session.selection.exam}
                levelLabel={
                  session.selection.exam === "ЕГЭ"
                    ? getExamLevelLabel(session.selection.level)
                    : undefined
                }
                examNumber={currentTask.examNumber}
                topicTitle={
                  getTheoryTopic(currentTask.topicId)
                    ?.title ??
                  taskTopicLabels[currentTask.topicId] ??
                  "Математика"
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
                onNext={() => practice.move(1)}
                canNext={
                  practice.position >= 0 &&
                  practice.position + 1 < session.taskIds.length
                }
                onPrevious={() => practice.move(-1)}
                canPrevious={practice.position > 0}
                onBack={practice.returnToCatalog}
              />
            ) : (
              <section className="empty-state">
                <h1>
                  {session.invalidContext
                    ? "Подборка недоступна"
                    : "Задания скоро появятся"}
                </h1>
                {!session.invalidContext && (
                  <p>
                    {session.selection.exam} · Математика
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
                    : "Выбери другую тему или тип задания из демонстрационного банка."}
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
          {route.view === "premium" && <PremiumScreen onBack={back} onProfile={() => open("profile")} />}
          {route.view === "help" && <HelpScreen onBack={returnFromHelp} />}
          {(["favorites", "mistakes", "review"] as const).map((view) => route.view === view && (
            <StudyToolsScreen key={view} mode={view} events={state.events} tools={studyTools}
              isPremium={isPremium} onTask={openTaskById} onTheory={openTheory} onPremium={openPremium} />
          ))}
          {route.view === "mock" && (
            <MockExamScreen exam={state.exam} onExamChange={practice.changeExam} onBack={back} onOpenTheory={openTheory}
              onAnswer={recordAnswer} onSelfAssessment={(task, score) => confirmSelfAssessment(task, score, true)}
              onSolutionViewed={(task, attemptId, sessionId) => {
                if (attemptId) recordSolutionViewed(task, attemptId, true);
                else recordSolutionExposed(task, sessionId);
              }} />
          )}
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
      </div>
      <nav className="mobile-nav" aria-label="Нижняя навигация">
        {navigation.slice(0, 4).map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            className={activeView === view ? "active" : ""}
            aria-current={activeView === view ? "page" : undefined}
            onClick={() => open(view)}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          className={
            activeView === "trainer" ||
            activeView === "profile" ||
            activeView === "premium" ||
            activeView === "help" ||
            ["favorites", "mistakes", "review", "mock"].includes(activeView)
              ? "active"
              : ""
          }
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <Menu size={22} />
          <span>Ещё</span>
        </button>
      </nav>
      <dialog
        ref={menuDialog}
        className="navigation-dialog"
        aria-labelledby="menu-title"
        onClose={() => setMoreOpen(false)}
        onCancel={() => setMoreOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMoreOpen(false);
        }}
      >
        <div className="dialog-title">
          <h2 id="menu-title">Разделы</h2>
          <button
            className="icon-button"
            onClick={() => setMoreOpen(false)}
            aria-label="Закрыть меню"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Дополнительные разделы">
          {moreNavigation.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              className={phoneLayout && view === "trainer" ? "menu-secondary-start" : undefined}
              aria-current={activeView === view ? "page" : undefined}
              onClick={() => open(view)}
            >
              <Icon size={23} aria-hidden="true" />
              {phoneLayout ? <span className="menu-item-label">{label}</span> : label}
              {phoneLayout && (view === "trainer" || view === "review") && <span className="menu-premium-label">Premium</span>}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
          <button onClick={openHelp}>
            <CircleHelp size={23} aria-hidden="true" />
            Помощь и объяснения
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button onClick={() => open("premium")}>
            <Grid2X2 size={23} />
            {phoneLayout ? "Точка Premium" : "Premium"}
            <ChevronRight size={18} />
          </button>
        </nav>
      </dialog>
    </div>
  );
}
