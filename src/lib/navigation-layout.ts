import type { View } from "./navigation";

export type SidebarMode = "expanded" | "hidden";
export function restoredSidebar(value: string | null): SidebarMode {
  return value === "hidden" ? "hidden" : "expanded";
}
/** Presentation policy only; never grants an entitlement. */
export function showPlusOffer(premium: boolean, view: View, focus: boolean, dismissed: boolean, editing: boolean) {
  return !premium && !focus && !dismissed && !editing &&
    !["premium", "profile", "trainer", "progress", "review"].includes(view);
}
