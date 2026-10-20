export type ViewportPosition = {
  left: number;
  top: number;
  containers: { element: HTMLElement; left: number; top: number }[];
};

/** Preserve the reading position without remounting a lesson or a task. */
export function captureViewportPosition(): ViewportPosition {
  const containers: ViewportPosition["containers"] = [];
  for (
    let element = document.getElementById("main-content");
    element;
    element = element.parentElement
  ) {
    containers.push({ element, left: element.scrollLeft, top: element.scrollTop });
  }
  return { left: window.scrollX, top: window.scrollY, containers };
}

export function restoreViewportPosition(position: ViewportPosition) {
  for (const { element, left, top } of position.containers) {
    if (element.isConnected) element.scrollTo({ left, top, behavior: "auto" });
  }
  window.scrollTo({
    left: position.left,
    top: position.top,
    behavior: "auto",
  });
}
