import type { View } from "./navigation";

export type SidebarMode = "expanded" | "hidden";
export function phoneNavigationLayout(width: number, height: number, coarse: boolean, screenWidth: number, screenHeight: number) {
  return width <= 767 || (width <= 1023 && height <= 500 && coarse && screenWidth > 0 && screenHeight > 0 && Math.min(screenWidth, screenHeight) <= 767);
}
export function restoredSidebar(value: string | null): SidebarMode {
  return value === "hidden" ? "hidden" : "expanded";
}
/** Presentation policy only; never grants an entitlement. */
export function showPlusOffer(premium: boolean, view: View, focus: boolean, dismissed: boolean, editing: boolean, phone = false) {
  return !phone && !premium && !focus && !dismissed && !editing &&
    !["premium", "profile", "trainer", "progress", "review"].includes(view);
}
