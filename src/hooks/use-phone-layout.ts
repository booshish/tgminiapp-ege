"use client";

import { useSyncExternalStore } from "react";
import { phoneNavigationLayout } from "@/lib/navigation-layout";

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

function navigationSnapshot() {
  return phoneNavigationLayout(window.innerWidth, window.innerHeight, window.matchMedia("(pointer: coarse)").matches, window.screen.width, window.screen.height);
}
function subscribeNavigation(onChange: () => void) {
  // Screen dimensions prevent a tablet keyboard from being mistaken for a phone.
  const queries = [phoneQuery, "(max-width: 1023px) and (max-height: 500px) and (pointer: coarse)"];
  const media = queries.map(query => window.matchMedia(query));
  media.forEach(item => item.addEventListener("change", onChange));
  window.addEventListener("resize", onChange);
  return () => { media.forEach(item => item.removeEventListener("change", onChange)); window.removeEventListener("resize", onChange); };
}
export function usePhoneLayout(mode: "content" | "navigation" = "content") {
  return useSyncExternalStore(mode === "navigation" ? subscribeNavigation : subscribe, mode === "navigation" ? navigationSnapshot : getSnapshot, getServerSnapshot);
}
