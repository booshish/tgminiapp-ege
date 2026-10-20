"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

type ScrollEntry = {
  element: HTMLElement;
  top: number;
  left: number;
};

type ScrollSnapshot = {
  key: string;
  windowTop: number;
  windowLeft: number;
  entries: ScrollEntry[];
};

type CatalogScrollOptions = {
  visible: boolean;
  listKey: string;
  ready: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
};

const restoreWindowMs = 2500;
const scrollKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Tab",
]);

function scrollContainers(root: HTMLElement): HTMLElement[] {
  const containers = new Set<HTMLElement>();
  const isContainer = (element: HTMLElement) => {
    if (element === document.body || element === document.documentElement)
      return false;
    const style = window.getComputedStyle(element);
    return (
      /auto|scroll|overlay/.test(`${style.overflowY} ${style.overflowX}`) ||
      element.scrollTop > 0 ||
      element.scrollLeft > 0
    );
  };

  // Support a scroll viewport inside the catalog as well as around it.
  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (isContainer(element)) containers.add(element);
  });
  for (
    let element: HTMLElement | null = root;
    element;
    element = element.parentElement
  ) {
    if (isContainer(element)) containers.add(element);
  }
  return Array.from(containers);
}

function readSnapshot(
  root: HTMLElement,
  key: string,
  zero = false,
): ScrollSnapshot {
  return {
    key,
    windowTop: zero ? 0 : window.scrollY,
    windowLeft: zero ? 0 : window.scrollX,
    entries: scrollContainers(root).map((element) => ({
      element,
      top: zero ? 0 : element.scrollTop,
      left: zero ? 0 : element.scrollLeft,
    })),
  };
}

function applySnapshot(snapshot: ScrollSnapshot): boolean {
  for (const { element, top, left } of snapshot.entries) {
    if (!element.isConnected) continue;
    if (
      Math.abs(element.scrollTop - top) > 0.5 ||
      Math.abs(element.scrollLeft - left) > 0.5
    ) {
      const previousBehavior = element.style.scrollBehavior;
      element.style.scrollBehavior = "auto";
      element.scrollTo({ top, left, behavior: "auto" });
      element.style.scrollBehavior = previousBehavior;
    }
  }
  if (
    Math.abs(window.scrollY - snapshot.windowTop) > 0.5 ||
    Math.abs(window.scrollX - snapshot.windowLeft) > 0.5
  ) {
    const page = document.scrollingElement as HTMLElement | null;
    const previousBehavior = page?.style.scrollBehavior;
    if (page) page.style.scrollBehavior = "auto";
    window.scrollTo({
      top: snapshot.windowTop,
      left: snapshot.windowLeft,
      behavior: "auto",
    });
    if (page) page.style.scrollBehavior = previousBehavior ?? "";
  }

  return (
    Math.abs(window.scrollY - snapshot.windowTop) <= 0.5 &&
    Math.abs(window.scrollX - snapshot.windowLeft) <= 0.5 &&
    snapshot.entries.every(
      ({ element, top, left }) =>
        !element.isConnected ||
        (Math.abs(element.scrollTop - top) <= 0.5 &&
          Math.abs(element.scrollLeft - left) <= 0.5),
    )
  );
}

/** Keep the catalog mounted; call capture before hiding it to enter practice. */
export function useCatalogScroll({
  visible,
  listKey,
  ready,
  rootRef,
}: CatalogScrollOptions) {
  const snapshotRef = useRef<ScrollSnapshot | null>(null);
  const listKeyRef = useRef(listKey);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  const capture = useCallback(() => {
    if (!visible || !ready || !rootRef.current) return;
    cancelRestoreRef.current?.();
    snapshotRef.current = readSnapshot(rootRef.current, listKey);
  }, [visible, ready, rootRef, listKey]);

  const reset = useCallback(() => {
    cancelRestoreRef.current?.();
    snapshotRef.current = null;
    if (!visible || !ready || !rootRef.current) return;
    const snapshot = readSnapshot(rootRef.current, listKey, true);
    snapshotRef.current = snapshot;
    applySnapshot(snapshot);
  }, [visible, ready, rootRef, listKey]);

  useLayoutEffect(() => {
    if (listKeyRef.current !== listKey) {
      snapshotRef.current = null;
      listKeyRef.current = listKey;
    }
    const root = rootRef.current;
    if (!visible || !ready || !root) return;

    const snapshot =
      snapshotRef.current?.key === listKey
        ? snapshotRef.current
        : readSnapshot(root, listKey, true);
    snapshotRef.current = snapshot;
    let restoring = true;
    let disposed = false;
    let frame: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const remember = (event: Event) => {
      if (restoring || disposed) return;
      // Scanning computed styles is only needed on entry and explicit capture,
      // not on every scroll frame. Newly inserted scroll viewports identify
      // themselves through the captured scroll event.
      const elements = new Set(
        snapshotRef.current?.entries
          .filter(({ element }) => element.isConnected)
          .map(({ element }) => element) ?? [],
      );
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target !== document.body &&
        target !== document.documentElement &&
        (root.contains(target) || target.contains(root))
      )
        elements.add(target);
      snapshotRef.current = {
        key: listKey,
        windowTop: window.scrollY,
        windowLeft: window.scrollX,
        entries: Array.from(elements, (element) => ({
          element,
          top: element.scrollTop,
          left: element.scrollLeft,
        })),
      };
    };
    const cancelRestore = () => {
      if (!restoring) return;
      restoring = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      frame = null;
      timeout = null;
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("pointerdown", cancelRestore, true);
      window.removeEventListener("touchstart", cancelRestore, true);
      window.removeEventListener("wheel", cancelRestore, true);
      window.removeEventListener("keydown", cancelForKeyboard, true);
      window.removeEventListener("resize", queueRestore);
      window.visualViewport?.removeEventListener("resize", queueRestore);
      root.removeEventListener("load", queueRestore, true);
    };
    const cancelForKeyboard = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) cancelRestore();
    };
    const queueRestore = () => {
      if (!restoring || disposed || frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        // A short initial layout may clamp the requested offset. Retry until
        // content arrives, and stop immediately when the student takes over.
        if (!applySnapshot(snapshot)) queueRestore();
      });
    };

    cancelRestoreRef.current = cancelRestore;

    // This first write runs before paint, rather than showing the top of the list.
    if (!applySnapshot(snapshot)) queueRestore();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(queueRestore);
      resizeObserver.observe(root);
      for (const { element } of snapshot.entries) {
        resizeObserver.observe(element);
        Array.from(element.children).forEach((child) =>
          resizeObserver?.observe(child),
        );
      }
    }
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(queueRestore);
      mutationObserver.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    window.addEventListener("pointerdown", cancelRestore, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchstart", cancelRestore, {
      capture: true,
      passive: true,
    });
    window.addEventListener("wheel", cancelRestore, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", cancelForKeyboard, true);
    window.addEventListener("resize", queueRestore);
    window.visualViewport?.addEventListener("resize", queueRestore);
    root.addEventListener("load", queueRestore, true);
    document.fonts?.ready.then(queueRestore);
    timeout = setTimeout(cancelRestore, restoreWindowMs);

    // Scroll events do not bubble from elements, hence the capture listener.
    window.addEventListener("scroll", remember, {
      capture: true,
      passive: true,
    });
    return () => {
      disposed = true;
      cancelRestore();
      window.removeEventListener("scroll", remember, true);
      if (cancelRestoreRef.current === cancelRestore)
        cancelRestoreRef.current = null;
    };
  }, [visible, ready, listKey, rootRef]);

  return { capture, reset };
}
