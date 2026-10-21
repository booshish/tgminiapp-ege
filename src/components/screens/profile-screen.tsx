"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleHelp, Focus, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { ExamPicker, PageIntro } from "@/components/ui";
import { SubscriptionStatusCard } from "@/components/subscription-status-card";
import type { LearningState } from "@/lib/learning-events";
import type { Exam } from "@/lib/navigation";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import "./home-profile-mobile.css";

type Props = {
  state: LearningState;
  isPremium: boolean;
  demoAllowed: boolean;
  onToggleDemo: () => void;
  onExamChange: (exam: Exam) => void;
  onFontScale: (scale: LearningState["fontScale"]) => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onFocusModeChange: (enabled: boolean) => void;
  onBreakReminderChange: (minutes: 90 | 120 | 0) => void;
  onHelp: () => void;
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
  onBreakReminderChange,
  onHelp,
  onClear,
  onPremium,
}: Props) {
  const isPhone = usePhoneLayout();
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
  const textSetting = (
    <div key="text" data-setting="text" className="setting-row">
      <div>
        <h3>Размер текста</h3>
        <p>Выбери удобный размер для чтения.</p>
      </div>
      <div className="segmented font-options" role="group" aria-label="Размер текста">
        <button
          aria-pressed={state.fontScale === "standard"}
          className={state.fontScale === "standard" ? "selected" : ""}
          onClick={() => onFontScale("standard")}
        >
          Обычный
        </button>
        <button
          aria-pressed={state.fontScale === "large"}
          className={state.fontScale === "large" ? "selected" : ""}
          onClick={() => onFontScale("large")}
        >
          Крупный
        </button>
        <button
          aria-pressed={state.fontScale === "huge"}
          className={state.fontScale === "huge" ? "selected" : ""}
          onClick={() => onFontScale("huge")}
        >
          Очень крупный
        </button>
      </div>
    </div>
  );

  const appearanceSetting = (
    <div key="appearance" data-setting="appearance" className="setting-row appearance-setting">
      <div>
        <h3>Оформление</h3>
        <p id="appearance-description">
          Для всех страниц, включая концентрацию. Выбор сохраняется в этом браузере.
        </p>
      </div>
      <div
        className="segmented theme-options"
        role="group"
        aria-label="Тема оформления"
        aria-describedby="appearance-description"
      >
        {([
          { value: "light", label: "Светлая", icon: Sun },
          { value: "dark", label: "Тёмная", icon: Moon },
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
  );

  const focusSetting = (
    <div key="focus" data-setting="focus" className="setting-row focus-setting">
      <div>
        <h3><Focus size={19} aria-hidden="true" /> Режим концентрации</h3>
        <p id="focus-description">
          Убирает лишние панели в заданиях и теории. Кнопка «Выйти» остаётся вверху страницы.
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
  );

  const breaksSetting = (
    <div key="breaks" data-setting="breaks" className="setting-row appearance-setting">
      <div>
        <h3>Напоминания о перерыве</h3>
        <p id="break-description">
          После непрерывной работы, без прерывания решения. После 15 минут
          неактивности отсчёт начинается заново.
        </p>
      </div>
      <div className="segmented reminder-options" role="group" aria-label="Интервал напоминания о перерыве" aria-describedby="break-description">
        {([
          { value: 90, label: "1,5 часа" },
          { value: 120, label: "2 часа" },
          { value: 0, label: "Выкл." },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={state.breakReminderMinutes === option.value}
            className={state.breakReminderMinutes === option.value ? "selected" : ""}
            onClick={() => onBreakReminderChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const helpSection = (
    <section key="help" className="settings-card profile-help">
      <h2><CircleHelp size={22} aria-hidden="true" /> Помощь и объяснения</h2>
      <p>Ответы о начислении XP, цвете шкал, сериях и самооценке.</p>
      <button type="button" className="text-button" onClick={onHelp}>
        Открыть справку <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );

  const accountSection = (
    <section key="account" className="profile-card">
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
  );

  const settingsSection = (
    <section key="settings" className="settings-card profile-settings">
      <h2>Настройки</h2>
      {isPhone
        ? [appearanceSetting, focusSetting, breaksSetting, textSetting]
        : [textSetting, appearanceSetting, focusSetting, breaksSetting]}

    </section>
  );

  const subscriptionSection = (
    <SubscriptionStatusCard key="subscription" onPremium={onPremium} developerPreview={isPremium} />
  );

  const dataSection = (
    <section key="data" className="settings-card profile-data">
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
  );

  return (
    <>
      <PageIntro eyebrow="ЛИЧНОЕ ПРОСТРАНСТВО" title="Мой профиль">
        Подготовка и настройки на этом устройстве.
      </PageIntro>
      <div className="profile-screen-layout">
        {isPhone
          ? [accountSection, settingsSection, subscriptionSection, helpSection, dataSection]
          : [helpSection, accountSection, settingsSection, subscriptionSection, dataSection]}
      </div>
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
