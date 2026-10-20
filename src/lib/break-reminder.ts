export type BreakReminderMinutes = 0 | 90 | 120;

export const breakReminderConfig = {
  defaultMinutes: 120 as BreakReminderMinutes,
  inactivityMs: 15 * 60_000,
  tickMs: 30_000,
  activityThrottleMs: 1_000,
};

/** Session-only monotonic timestamps; no personal data or study results are collected. */
export type BreakReminderState = {
  startedAt: number | null;
  lastActivityAt: number | null;
  pausedAt: number | null;
  pending: boolean;
  visible: boolean;
  safePointKey: string;
};

export type BreakReminderAction =
  | { type: "activity" | "tick" | "pause" | "resume" | "dismiss"; now: number }
  | { type: "safe-point"; now: number; key: string }
  | { type: "reset"; key?: string };

export function emptyBreakReminderState(safePointKey = ""): BreakReminderState {
  return {
    startedAt: null,
    lastActivityAt: null,
    pausedAt: null,
    pending: false,
    visible: false,
    safePointKey,
  };
}

function timedOut(state: BreakReminderState, now: number) {
  return state.lastActivityAt !== null &&
    (now < state.lastActivityAt || now - state.lastActivityAt >= breakReminderConfig.inactivityMs);
}

/**
 * Becoming due only queues a reminder. It can appear at a later explicit safe point,
 * such as a completed check or navigation, never from the interval or a typing event.
 */
export function updateBreakReminder(
  previous: BreakReminderState,
  action: BreakReminderAction,
  minutes: BreakReminderMinutes,
): BreakReminderState {
  const key = action.type === "safe-point" ? action.key : previous.safePointKey;
  if (action.type === "reset") return emptyBreakReminderState(action.key ?? previous.safePointKey);
  if (minutes !== 90 && minutes !== 120) return emptyBreakReminderState(key);
  const { now } = action;
  if (!Number.isFinite(now) || now < 0) return previous;

  if (action.type === "pause") {
    return previous.pausedAt !== null ? previous : { ...previous, pausedAt: now, visible: false };
  }
  if (action.type === "resume") {
    if (previous.pausedAt === null) return previous;
    if (timedOut(previous, now) || now < previous.pausedAt) return emptyBreakReminderState(key);
    const pausedFor = now - previous.pausedAt;
    return {
      ...previous,
      startedAt: previous.startedAt === null ? null : previous.startedAt + pausedFor,
      lastActivityAt: previous.lastActivityAt === null ? null : now,
      pausedAt: null,
    };
  }
  if (previous.pausedAt !== null) {
    // A background render or route update must not act as a student's safe point.
    return key === previous.safePointKey ? previous : { ...previous, safePointKey: key };
  }

  let state = timedOut(previous, now) ? emptyBreakReminderState(previous.safePointKey) : previous;
  if (action.type === "dismiss") {
    return { ...emptyBreakReminderState(key), startedAt: now, lastActivityAt: now };
  }
  if (action.type === "activity") {
    state = { ...state, startedAt: state.startedAt ?? now, lastActivityAt: now };
  }
  const due = state.startedAt !== null && now - state.startedAt >= minutes * 60_000;
  const pending = state.pending || due;
  if (action.type === "safe-point") {
    const changed = key !== state.safePointKey;
    return {
      ...state,
      pending,
      safePointKey: key,
      visible: state.visible || (changed && pending),
    };
  }
  return pending === state.pending ? state : { ...state, pending };
}
