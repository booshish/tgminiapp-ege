"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Grid2X2,
  House,
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
import { useDemoProgress } from "@/hooks/use-demo-progress";
import { useStudyNavigation } from "@/hooks/use-study-navigation";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useCatalogScroll } from "@/hooks/use-catalog-scroll";
import { tasks, taskTopicLabels } from "@/lib/tasks";
import { getTaskXPScoringRule } from "@/lib/exam-scores";
import {
  catalogListKey,
  emptyTaskState,
  type CatalogSelection,
} from "@/lib/practice";
import { getExamLevelLabel } from "@/lib/exams";
import { theoryTopics } from "@/lib/theory";
import { viewTitles, type View } from "@/lib/navigation";
import { getGameSummary, getSelfAssessment } from "@/lib/gamification";
import "./appearance.css";

const navigation: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Главная", icon: House },
  { view: "theory", label: "Теория", icon: BookOpen },
  { view: "catalog", label: "Задания", icon: ListChecks },
  { view: "progress", label: "Прогресс", icon: TrendingUp },
  { view: "trainer", label: "Мой тренер", icon: Sparkles },
  { view: "profile", label: "Профиль", icon: UserRound },
];
const demoAllowed = process.env.NEXT_PUBLIC_ENABLE_PREMIUM_DEMO === "true";

export function StudyApp() {
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
    rememberTask,
    recordAnswer,
    confirmSelfAssessment,
    recordSolutionViewed,
    clearLocalData,
  } = useDemoProgress();
  const [demoPremium, setDemoPremium] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const game = getGameSummary(state.game, now);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
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
  const activeView = route.view === "tasks" ? "catalog" : route.view;
  const { currentTask, session } = practice;
  const currentIndex = currentTask
    ? tasks.findIndex((task) => task.id === currentTask.id)
    : 0;
  const pageKey =
    route.view === "catalog"
      ? "catalog"
      : `${route.view}:${currentIndex}:${route.topicId ?? ""}:${route.materialId ?? ""}`;

  useEffect(() => {
    if (!ready) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const theme = state.theme === "system"
        ? (query.matches ? "dark" : "light")
        : state.theme;
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content", theme === "dark" ? "#1b211c" : "#f8f6f0",
      );
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
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

  useEffect(() => {
    if (ready && route.view === "tasks" && currentTask)
      rememberTask(currentIndex);
  }, [ready, route.view, currentIndex, currentTask, rememberTask]);
  useEffect(() => {
    if (!ready) return;
    if (route.view !== "catalog") {
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
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pageKey, ready, route.view]);
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
    if (view === "catalog") practice.openCatalog();
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
    });
  }
  function continuePractice() {
    if (practice.resume()) return;
    const remembered = tasks[state.lastTaskIndex];
    if (
      remembered?.examType.includes(state.exam) &&
      (state.exam === "ОГЭ" || remembered.level === practice.catalog.level)
    ) {
      practice.start(
        {
          ...practice.catalog,
          exam: state.exam,
          mode: "topic",
          examNumber: undefined,
          topicId: undefined,
          prototypeId: undefined,
        },
        remembered.id,
      );
    } else startPractice();
  }
  function startFromCatalog(selection: CatalogSelection) {
    catalogScroll.capture();
    practice.start(selection);
  }
  const openPremium = () => open("premium");
  const openTheory = (topicId?: string) => {
    if (route.view === "catalog") catalogScroll.capture();
    navigate("theory", { topicId });
  };

  return (
    <div className={`app-shell font-${state.fontScale}${state.focusMode && route.view === "tasks" ? " focus-mode" : ""}`}>
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
        </header>
        <main
          id="main-content"
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
          {(storageWarning || practice.storageWarning || catalogScroll.storageWarning) && (
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
            />
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
            />
          </div>
          {route.view === "theory" && (
            <TheoryScreen
              exam={state.exam}
              topicId={route.topicId}
              materialId={route.materialId}
              onExamChange={practice.changeExam}
              onOpenTopic={(topicId) => navigate("theory", { topicId })}
              onOpenMaterial={(topicId, materialId) =>
                navigate("theory", { topicId, materialId })
              }
              onPractice={startPractice}
              onBack={() => {
                if (route.topicId) {
                  navigate(
                    "theory",
                    route.materialId ? { topicId: route.topicId } : {},
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
                exam={session.selection.exam}
                levelLabel={
                  session.selection.exam === "ЕГЭ"
                    ? getExamLevelLabel(session.selection.level)
                    : undefined
                }
                examNumber={currentTask.examNumber}
                topicTitle={
                  theoryTopics.find((topic) => topic.id === currentTask.topicId)
                    ?.title ?? taskTopicLabels[currentTask.topicId] ?? "Математика"
                }
                value={session.states[currentTask.id] ?? emptyTaskState()}
                onChange={practice.changeTask}
                onAnswer={recordAnswer}
                maxPrimaryScore={getTaskXPScoringRule(currentTask)?.maxPrimaryScore ?? null}
                selfAssessment={getSelfAssessment(state.game, currentTask.id)}
                onSelfAssessment={confirmSelfAssessment}
                onSolutionViewed={recordSolutionViewed}
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
            />
          )}
          {route.view === "trainer" && (
            <TrainerScreen
              state={state}
              isPremium={isPremium}
              onPremium={openPremium}
              onTheory={openTheory}
              onStart={startPractice}
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
              onClear={() => {
                const practiceCleared = practice.reset();
                const scrollCleared = catalogScroll.reset();
                const success = clearLocalData() && practiceCleared && scrollCleared;
                if (success) {
                  setDemoPremium(false);
                }
                return success;
              }}
              onPremium={openPremium}
            />
          )}
          {route.view === "premium" && <PremiumScreen onBack={back} />}
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
            activeView === "premium"
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
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Дополнительные разделы">
          {navigation.slice(4).map(({ view, label, icon: Icon }) => (
            <button key={view} onClick={() => open(view)}>
              <Icon size={23} />
              {label}
              <ChevronRight size={18} />
            </button>
          ))}
          <button onClick={() => open("premium")}>
            <Grid2X2 size={23} />
            Premium
            <ChevronRight size={18} />
          </button>
        </nav>
      </dialog>
    </div>
  );
}
