"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { practiceBank as tasks } from "@/lib/tasks";
import { allTheoryTopics as theoryTopics, getTheoryTopic } from "@/lib/theory";
import {
  bookmarkKey, canReadStudyToolsState, emptyStudyToolsState, legacyStudyToolsStorageKey,
  parseStudyToolsState, studyToolsStorageKey, toggleBookmark as toggleBookmarkState,
  type BookmarkInput, type BookmarkKind, type StudyToolsState,
} from "@/lib/study-tools";

const catalog = { tasks, topics: theoryTopics, resolveTopic: getTheoryTopic };

export function useStudyTools() {
  const [state, setState] = useState<StudyToolsState>(emptyStudyToolsState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const latest = useRef(state);
  const initialized = useRef(false);
  const canPersist = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(studyToolsStorageKey) ?? localStorage.getItem(legacyStudyToolsStorageKey);
      canPersist.current = canReadStudyToolsState(raw);
      if (!canPersist.current) setStorageWarning(true);
      latest.current = parseStudyToolsState(raw, catalog);
      setState(latest.current);
    } catch { setStorageWarning(true); }
    setReady(true);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== studyToolsStorageKey && event.key !== null) return;
      if (!canReadStudyToolsState(event.newValue)) { setStorageWarning(true); return; }
      canPersist.current = true;
      setStorageWarning(false);
      latest.current = parseStudyToolsState(event.newValue, catalog);
      setState(latest.current);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const update = useCallback((change: (value: StudyToolsState) => StudyToolsState) => {
    if (!initialized.current) return;
    if (canPersist.current) {
      try {
        const raw = localStorage.getItem(studyToolsStorageKey) ?? localStorage.getItem(legacyStudyToolsStorageKey);
        if (!canReadStudyToolsState(raw)) { canPersist.current = false; setStorageWarning(true); }
        else latest.current = parseStudyToolsState(raw, catalog);
      } catch { canPersist.current = false; setStorageWarning(true); }
    }
    const next = change(latest.current);
    latest.current = next;
    if (canPersist.current) {
      try { localStorage.setItem(studyToolsStorageKey, JSON.stringify(next)); }
      catch { canPersist.current = false; setStorageWarning(true); }
    }
    setState(next);
  }, []);

  const toggleBookmark = useCallback((input: BookmarkInput) => {
    update((previous) => toggleBookmarkState(previous, input, catalog));
  }, [update]);
  const removeBookmark = useCallback((key: string) => {
    update((previous) => ({ ...previous, bookmarks: previous.bookmarks.filter((item) => item.key !== key) }));
  }, [update]);
  const clearBookmarks = useCallback(() => {
    try {
      localStorage.removeItem(studyToolsStorageKey);
      localStorage.removeItem(legacyStudyToolsStorageKey);
      canPersist.current = true;
      latest.current = emptyStudyToolsState();
      setState(latest.current);
      setStorageWarning(false);
      return true;
    } catch { setStorageWarning(true); return false; }
  }, []);
  const isBookmarked = useCallback((kind: BookmarkKind, itemId: string) =>
    state.bookmarks.some((item) => item.key === bookmarkKey(kind, kind === "theory" ? getTheoryTopic(itemId)?.id ?? itemId : itemId)), [state.bookmarks]);

  return { bookmarks: state.bookmarks, ready, storageWarning, toggleBookmark, removeBookmark, clearBookmarks, isBookmarked };
}
export type StudyToolsController = ReturnType<typeof useStudyTools>;
