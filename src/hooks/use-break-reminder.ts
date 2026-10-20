"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  breakReminderConfig,
  emptyBreakReminderState,
  updateBreakReminder,
  type BreakReminderAction,
  type BreakReminderMinutes,
} from "@/lib/break-reminder";

type BreakReminderOptions = {
  minutes: BreakReminderMinutes;
  /** Changes only after a real check/confirmation or navigation, not while typing. */
  safePointKey: string;
  ready: boolean;
};

export function useBreakReminder({ minutes, safePointKey, ready }: BreakReminderOptions) {
  const state = useRef(emptyBreakReminderState(safePointKey));
  const options = useRef({ minutes, safePointKey });
  options.current = { minutes, safePointKey };
  const [visible, setVisible] = useState(false);
  const lastActivityDispatch = useRef(-Infinity);

  const dispatch = useCallback((action: BreakReminderAction) => {
    const next = updateBreakReminder(state.current, action, options.current.minutes);
    state.current = next;
    setVisible((previous) => previous === next.visible ? previous : next.visible);
  }, []);
  const reset = useCallback(() => {
    dispatch({ type: "reset", key: options.current.safePointKey });
    lastActivityDispatch.current = -Infinity;
  }, [dispatch]);
  const dismiss = useCallback(() => {
    dispatch({ type: "dismiss", now: performance.now() });
  }, [dispatch]);

  useEffect(() => {
    reset();
  }, [minutes, ready, reset]);

  useEffect(() => {
    if (!ready) return;
    dispatch({ type: "safe-point", key: safePointKey, now: performance.now() });
  }, [safePointKey, ready, dispatch]);

  useEffect(() => {
    if (!ready || minutes === 0) return;
    const active = () => document.visibilityState === "visible" && document.hasFocus();
    const activity = () => {
      if (!active()) return;
      const now = performance.now();
      if (now - lastActivityDispatch.current < breakReminderConfig.activityThrottleMs) return;
      lastActivityDispatch.current = now;
      dispatch({ type: "resume", now });
      dispatch({ type: "activity", now });
    };
    const pause = () => dispatch({ type: "pause", now: performance.now() });
    const resume = () => {
      if (active()) dispatch({ type: "resume", now: performance.now() });
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") pause();
      else resume();
    };
    const timer = window.setInterval(() => {
      if (active()) dispatch({ type: "tick", now: performance.now() });
    }, breakReminderConfig.tickMs);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    // Capture includes scrolls in nested reading/practice containers.
    window.addEventListener("scroll", activity, { passive: true, capture: true });
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", visibility);
    if (!active()) pause();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity, true);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [minutes, ready, dispatch]);

  return { visible, dismiss, reset };
}
