"use client";

import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

/** The same visible control is used on the page and inside the modal menu. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === "light"
    ? "Тема: включить тёмную"
    : "Тема: включить светлую";

  return (
    <button
      type="button"
      className="theme-toggle study-control-button"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {theme === "light"
        ? <Moon size={20} aria-hidden="true" />
        : <Sun size={20} aria-hidden="true" />}
      <span>Тема</span>
    </button>
  );
}
