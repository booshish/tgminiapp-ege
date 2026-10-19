"use client";

import { useEffect } from "react";
import {
  ChevronRight,
  Flower2,
  Grid2X2,
  House,
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
import { useDemoProgress } from "@/hooks/use-demo-progress";
import { useStudyNavigation } from "@/hooks/use-study-navigation";
import { viewTitles, type View } from "@/lib/navigation";

const navItems: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Главная", icon: House },
  { view: "catalog", label: "Каталог", icon: Grid2X2 },
  { view: "progress", label: "Прогресс", icon: TrendingUp },
  { view: "profile", label: "Профиль", icon: UserRound },
];

export function StudyApp() {
  const { route, navigate, back } = useStudyNavigation();
  const {
    progress,
    ready,
    storageWarning,
    dismissStorageWarning,
    setExam,
    rememberTask,
    recordAnswer,
    resetProgress,
  } = useDemoProgress();
  const activeView =
    route.view === "tasks" || route.view === "theory" ? "catalog" : route.view;
  const start = (index = progress.lastTaskIndex) => navigate("tasks", index);

  useEffect(() => {
    if (ready && route.view === "tasks") rememberTask(route.taskIndex);
  }, [ready, route.view, route.taskIndex, rememberTask]);

  useEffect(() => {
    if (!ready) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [route.view, route.taskIndex, ready]);

  return (
    <div className="app-shell">
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
          onClick={() => navigate("home")}
          aria-label="Точка — на главную"
        >
          <Brand />
        </button>
        <p className="brand-caption">
          Маленькие шаги.
          <br />
          Большие возможности.
        </p>
        <span className="sidebar-label">ТВОЁ ОБУЧЕНИЕ</span>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navItems
            .filter((item) => item.view !== "profile")
            .map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                className={activeView === view ? "active" : ""}
                aria-current={activeView === view ? "page" : undefined}
                onClick={() => navigate(view)}
              >
                <Icon size={21} strokeWidth={1.7} />
                {label}
                {activeView === view && <span className="active-dot" />}
              </button>
            ))}
          <button
            className={route.view === "trainer" ? "active" : ""}
            aria-current={route.view === "trainer" ? "page" : undefined}
            onClick={() => navigate("trainer")}
          >
            <Sparkles size={21} strokeWidth={1.7} />
            Мой тренер<span className="mini-new">ДЕМО</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-encouragement">
            <span className="sidebar-flower">
              <Flower2 size={38} strokeWidth={1.1} />
            </span>
            <p>
              Не сравнивай себя с другими.
              <br />
              <strong>Сравнивай с собой вчера.</strong>
            </p>
          </div>
          <button
            className={`sidebar-profile ${route.view === "profile" ? "active" : ""}`}
            onClick={() => navigate("profile")}
            aria-current={route.view === "profile" ? "page" : undefined}
          >
            <span className="avatar">
              <UserRound size={20} strokeWidth={1.5} />
            </span>
            <span>
              <strong>Мой профиль</strong>
              <small>Приятно учиться вместе</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <span className="sidebar-version">Точка · Первая демоверсия</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="desktop-breadcrumb">
            <span>Моё пространство</span>
            <ChevronRight size={13} />
            <strong>{viewTitles[route.view]}</strong>
          </div>
          <button
            className="mobile-brand brand-button"
            onClick={() => navigate("home")}
            aria-label="Точка — на главную"
          >
            <Brand />
          </button>
          <div className="topbar-right">
            <span className="demo-badge">
              <span /> Демо-версия
            </span>
            <span className="topbar-divider" />
            <button
              className="avatar"
              onClick={() => navigate("profile")}
              aria-label="Открыть профиль"
            >
              <UserRound size={19} strokeWidth={1.6} />
            </button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={`main-content view-${route.view}`}
        >
          {storageWarning && (
            <div className="storage-warning" role="status">
              <ShieldCheck size={18} />
              <span>
                Браузер не разрешил сохранить данные. Прогресс доступен до
                закрытия страницы.
              </span>
              <button
                onClick={() => dismissStorageWarning()}
                aria-label="Скрыть уведомление"
              >
                <X size={17} />
              </button>
            </div>
          )}
          {route.view === "home" && (
            <HomeScreen
              exam={progress.exam}
              onExamChange={setExam}
              onStart={start}
              onNavigate={navigate}
            />
          )}
          {route.view === "catalog" && (
            <CatalogScreen
              exam={progress.exam}
              onExamChange={setExam}
              onStart={start}
              onNavigate={navigate}
            />
          )}
          {route.view === "theory" && (
            <TheoryScreen exam={progress.exam} onStart={start} onBack={back} />
          )}
          {route.view === "trainer" && (
            <TrainerScreen onStart={start} onNavigate={navigate} />
          )}
          {route.view === "progress" && (
            <ProgressScreen
              progress={progress}
              onStart={start}
              onReset={resetProgress}
            />
          )}
          {route.view === "profile" && (
            <ProfileScreen progress={progress} onNavigate={navigate} />
          )}
          {route.view === "tasks" && (
            <TaskScreen
              key={route.taskIndex}
              taskIndex={route.taskIndex}
              records={progress.records}
              exam={progress.exam}
              onAnswer={recordAnswer}
              onNext={(index) => start(index)}
              onFinish={() => navigate("progress")}
              onBack={back}
            />
          )}
        </main>
        <footer className="desktop-footer">
          <span>Создаём уверенность в знаниях</span>
          <span>
            Точка, с которой всё начинается <Flower2 size={13} />
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Нижняя навигация">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            className={activeView === view ? "active" : ""}
            aria-current={activeView === view ? "page" : undefined}
            onClick={() => navigate(view)}
          >
            <Icon size={21} strokeWidth={activeView === view ? 2 : 1.6} />
            <span>{label}</span>
            <i />
          </button>
        ))}
      </nav>
    </div>
  );
}
