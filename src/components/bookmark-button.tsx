"use client";

import { Bookmark } from "lucide-react";

export function BookmarkButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" className="bookmark-button" aria-pressed={active} onClick={onClick}
      aria-label={active ? "В избранном — убрать" : "Сохранить в избранное"}>
      <Bookmark size={19} aria-hidden="true" fill={active ? "currentColor" : "none"} />
      <span>{active ? "В избранном" : "Сохранить"}</span>
    </button>
  );
}
