"use client";

import { Bookmark } from "lucide-react";

export function BookmarkButton({ active, onClick, savedLabel }: { active: boolean; onClick: () => void; savedLabel?: string }) {
  return (
    <button type="button" className="bookmark-button" aria-pressed={active} onClick={onClick}
      aria-label={active ? savedLabel ? `${savedLabel} — убрать из избранного` : "В избранном — убрать" : "Сохранить в избранное"}>
      <Bookmark size={19} aria-hidden="true" fill={active ? "currentColor" : "none"} />
      <span>{active ? savedLabel ?? "В избранном" : "Сохранить"}</span>
    </button>
  );
}
