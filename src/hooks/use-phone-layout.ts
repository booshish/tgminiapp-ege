"use client";

import { useSyncExternalStore } from "react";

/** Layout only. Learning sessions and saved preferences never depend on width. */
const phoneQuery = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(phoneQuery).matches;
}

function getServerSnapshot() {
  return false;
}

export function usePhoneLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
