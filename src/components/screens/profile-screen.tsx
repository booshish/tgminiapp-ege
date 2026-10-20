"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Focus, Monitor, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { ExamPicker, PageIntro } from "@/components/ui";
import type { LearningState } from "@/lib/learning-events";
import type { Exam } from "@/lib/navigation";

type Props = {
  state: LearningState;
  isPremium: boolean;
  demoAllowed: boolean;
  onToggleDemo: () => void;
  onExamChange: (exam: Exam) => void;
  onFontScale: (scale: LearningState["fontScale"]) => void;
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onFocusModeChange: (enabled: boolean) => void;
  onClear: () => boolean;
  onPremium: () => void;
};

export function ProfileScreen({
  state,
  isPremium,
  demoAllowed,
  onToggleDemo,
  onExamChange,
  onFontScale,
  onThemeChange,
  onFocusModeChange,
  onClear,
  onPremium,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) cancel.current?.focus();
  }, [confirm]);
  const cancelDeletion = () => {
    setConfirm(false);
    deleteButton.current?.focus();
  };
  return (
    <>
      <PageIntro eyebrow="ЛИЧНОЕ ПРОСТРАНСТВО" title="Мой профиль">
        Подготовка и настройки на этом устройстве.
      </PageIntro>
      <section className="profile-card">
        <div className="profile-heading">
          <span className="profile-avatar">
            <UserRound size={30} />
          </span>
          <div>
            <h2>Гостевой профиль</h2>
            <p>Авторизация и синхронизация ещё не подключены.</p>
          </div>
        </div>
        <h2>Моя подготовка</h2>
        <ExamPicker exam={state.exam} onChange={onExamChange} />
      </section>
      <section className="settings-card">
        <h2>Настройки</h2>
        <div className="setting-row">
          <div>
            <h3>Размер текста</h3>
            <p>Выбери удобный размер для чтения.</p>
          </div>
          <div className="segmented" role="group" aria-label="Размер текста">
            <button
              aria-pressed={state.fontScale === "standard"}
              className={state.fontScale === "standard" ? "selected" : ""}
              onClick={() => onFontScale("standard")}
            >
              Стандартный
            </button>
            <button
              aria-pressed={state.fontScale === "large"}
              className={state.fontScale === "large" ? "selected" : ""}
              onClick={() => onFontScale("large")}
            >
              Крупный
            </button>
          </div>
        </div>
        <div className="setting-row appearance-setting">
          <div>
            <h3>Оформление</h3>
            <p>По умолчанию — светлая тема. Системная включается по твоему выбору.</p>
          </div>
          <div className="segmented theme-options" role="group" aria-label="Тема оформления">
            {([
              { value: "light", label: "Светлая", icon: Sun },
              { value: "dark", label: "Тёмная", icon: Moon },
              { value: "system", label: "Системная", icon: Monitor },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={state.theme === value ? "selected" : ""}
                aria-pressed={state.theme === value}
                onClick={() => onThemeChange(value)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row focus-setting">
          <div>
            <h3><Focus size={19} aria-hidden="true" /> Режим концентрации</h3>
            <p id="focus-description">
              Скрывает основное меню во время решения. Кнопка возврата к заданиям остаётся.
            </p>
          </div>
          <button
            type="button"
            className="focus-switch"
            role="switch"
            aria-checked={state.focusMode}
            aria-label="Режим концентрации"
            aria-describedby="focus-description"
            onClick={() => onFocusModeChange(!state.focusMode)}
          >
            <span className="focus-switch-track" aria-hidden="true"><span /></span>
            <span>{state.focusMode ? "Включён" : "Выключен"}</span>
          </button>
        </div>
      </section>
      <section className="settings-card">
        <div className="section-title">
          <h2>Подписка</h2>
          <span className="tag">
            {isPremium ? "Демонстрационный Premium" : "Free"}
          </span>
        </div>
        <p>
          {isPremium
            ? "Открыт интерфейс Premium для разработки. Реальной подписки нет."
            : "Теория, доступные задания, проверка и разбор после ответа открыты бесплатно."}
        </p>
        <button className="text-button" onClick={onPremium}>
          Подробнее о Premium <ArrowRight size={18} />
        </button>
      </section>
      <section className="settings-card">
        <h2>
          <ShieldCheck size={22} /> Данные на устройстве
        </h2>
        <p>
          Ответы, опыт XP, настройки, черновики, время проверки и факт просмотра решения хранятся в этом
          браузере для будущего анализа. Имя, контакты и платёжные данные не
          запрашиваются. На сервер эти события не отправляются.
        </p>
        <p>
          Очистка браузера может удалить данные. Перенос между устройствами и
          надёжная серверная сохранность пока недоступны.
        </p>
        <button
          ref={deleteButton}
          className="subtle-button"
          onClick={() => {
            setConfirm(true);
            setDeleted(false);
            setDeleteError(false);
          }}
        >
          Удалить локальные данные
        </button>
        {confirm && (
          <div
            className="reset-confirm"
            role="alertdialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelDeletion();
            }}
          >
            <h3 id="delete-title">Удалить данные этого браузера?</h3>
            <p id="delete-description">
              Ответы, черновики, опыт XP, уровни, серии и выбранные настройки будут удалены с этого устройства. Восстановить их без резервной копии не получится.
            </p>
            <div>
              <button
                ref={cancel}
                className="button button-secondary"
                onClick={cancelDeletion}
              >
                Отмена
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  const success = onClear();
                  setConfirm(false);
                  setDeleted(success);
                  setDeleteError(!success);
                  deleteButton.current?.focus();
                }}
              >
                Удалить данные
              </button>
            </div>
          </div>
        )}
        {deleted && <p role="status">Локальные данные удалены.</p>}
        {deleteError && (
          <p role="alert">
            Браузер не разрешил удалить данные. Попробуй ещё раз или очисти
            данные сайта в настройках браузера.
          </p>
        )}
      </section>
      {demoAllowed && (
        <section className="developer-panel">
          <h2>Режим для разработчика</h2>
          <p>
            Переключатель показывает интерфейс Premium без покупки. Доступ
            управляется в браузере и не защищён сервером. После перезагрузки
            снова включается Free.
          </p>
          <button className="button button-secondary" onClick={onToggleDemo}>
            {isPremium
              ? "Вернуться в Free"
              : "Включить демонстрационный Premium"}
          </button>
        </section>
      )}
    </>
  );
}
