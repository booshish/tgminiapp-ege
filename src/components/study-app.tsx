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
import { getPracticeTasks, tasks } from "@/lib/tasks";
import { viewTitles, type View } from "@/lib/navigation";

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
    rememberTask,
    recordAnswer,
    recordSolutionViewed,
    clearLocalData,
  } = useDemoProgress();
  const [demoPremium, setDemoPremium] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const isPremium = demoAllowed && demoPremium;
  const activeView = route.view === "tasks" ? "catalog" : route.view;
  const pool = getPracticeTasks({
    examType: state.exam,
    topicId: route.topicId,
    prototypeId: route.prototypeId,
  });
  const currentTask =
    pool.find((task) => task.id === tasks[route.taskIndex]?.id) ?? pool[0];
  const currentIndex = currentTask
    ? tasks.findIndex((task) => task.id === currentTask.id)
    : 0;
  const pageKey =
    route.view === "catalog"
      ? "catalog"
      : `${route.view}:${currentIndex}:${route.topicId ?? ""}:${route.materialId ?? ""}`;

  useEffect(() => {
    if (ready && route.view === "tasks" && currentTask)
      rememberTask(currentIndex);
  }, [ready, route.view, currentIndex, currentTask, rememberTask]);
  useEffect(() => {
    if (!ready) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pageKey, ready]);
  useEffect(() => {
    const dialog = menuDialog.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  function open(view: View) {
    // Remove the modal's inert state before the next screen receives focus.
    if (menuDialog.current?.open) menuDialog.current.close();
    setMoreOpen(false);
    navigate(view);
  }
  function startPractice(topicId?: string, prototypeId?: string) {
    const selected = getPracticeTasks({
      examType: state.exam,
      topicId,
      prototypeId,
    });
    if (!selected.length) {
      navigate("catalog", { topicId, prototypeId });
      return;
    }
    navigate("tasks", {
      taskIndex: tasks.findIndex((task) => task.id === selected[0].id),
      topicId,
      prototypeId,
    });
  }
  function continuePractice() {
    const remembered = tasks[state.lastTaskIndex];
    if (remembered?.examType.includes(state.exam))
      navigate("tasks", { taskIndex: state.lastTaskIndex });
    else startPractice();
  }
  function nextTask() {
    if (!currentTask || pool.length < 2) {
      navigate("catalog", {
        topicId: route.topicId,
        prototypeId: route.prototypeId,
      });
      return;
    }
    const next =
      pool[
        (pool.findIndex((task) => task.id === currentTask.id) + 1) % pool.length
      ];
    navigate("tasks", {
      taskIndex: tasks.findIndex((task) => task.id === next.id),
      topicId: route.topicId,
      prototypeId: route.prototypeId,
    });
  }
  const openPremium = () => navigate("premium");
  const openTheory = (topicId?: string) => navigate("theory", { topicId });

  return (
    <div className={`app-shell font-${state.fontScale}`}>
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
          {storageWarning && (
            <div className="storage-warning" role="status">
              <ShieldCheck size={20} />
              <span>
                Браузер не разрешил сохранить данные. После закрытия страницы
                они могут быть потеряны.
              </span>
              <button
                onClick={dismissStorageWarning}
                aria-label="Закрыть уведомление"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {route.view === "home" && (
            <HomeScreen
              exam={state.exam}
              onExamChange={setExam}
              onStart={continuePractice}
              onNavigate={open}
            />
          )}
          {route.view === "catalog" && (
            <CatalogScreen
              exam={state.exam}
              topicId={route.topicId}
              prototypeId={route.prototypeId}
              onExamChange={setExam}
              onSelectionChange={(topicId, prototypeId) =>
                navigate("catalog", { topicId, prototypeId })
              }
              onStart={startPractice}
              onTheory={openTheory}
            />
          )}
          {route.view === "theory" && (
            <TheoryScreen
              exam={state.exam}
              topicId={route.topicId}
              materialId={route.materialId}
              onExamChange={setExam}
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
            (currentTask ? (
              <TaskScreen
                key={`${currentTask.id}:${state.exam}`}
                task={currentTask}
                exam={state.exam}
                onAnswer={recordAnswer}
                onSolutionViewed={recordSolutionViewed}
                onNext={nextTask}
                onBack={back}
              />
            ) : (
              <section className="empty-state">
                <h1>Задания пока не опубликованы</h1>
                <p>
                  Выбери другую тему или тип задания из демонстрационного банка.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => navigate("catalog")}
                >
                  Выбрать задания
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
              onExamChange={setExam}
              onFontScale={setFontScale}
              onClear={() => {
                const success = clearLocalData();
                if (success) setDemoPremium(false);
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
