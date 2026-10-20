import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/break-reminder.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { breakReminderConfig, emptyBreakReminderState, updateBreakReminder } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const minute = 60_000;
function update(state, type, now, minutes = 120, extra = {}) {
  return updateBreakReminder(state, { type, now, ...extra }, minutes);
}
function studyFor(minutes, setting = 120) {
  let state = update(emptyBreakReminderState("task-a"), "activity", 0, setting);
  for (let elapsed = 10; elapsed <= minutes; elapsed += 10) {
    state = update(state, "activity", elapsed * minute, setting);
  }
  return state;
}

test("reminders default to two hours and have no forced interruption", () => {
  assert.equal(breakReminderConfig.defaultMinutes, 120);
  assert.equal(breakReminderConfig.inactivityMs, 15 * minute);
  let state = studyFor(120);
  assert.equal(state.pending, true);
  assert.equal(state.visible, false);
  state = update(state, "tick", 121 * minute);
  assert.equal(state.visible, false);
  state = update(state, "safe-point", 121 * minute, 120, { key: "task-a" });
  assert.equal(state.visible, false);
  state = update(state, "safe-point", 121 * minute, 120, { key: "checked-answer-1" });
  assert.equal(state.visible, true);
});

test("90 minutes is supported, off cannot queue or display reminders", () => {
  const ninety = studyFor(90, 90);
  assert.equal(ninety.pending, true);
  assert.equal(studyFor(90).pending, false);
  let off = update(ninety, "safe-point", 91 * minute, 0, { key: "checked" });
  assert.equal(off.visible, false);
  assert.equal(off.pending, false);
  off = update(off, "activity", 200 * minute, 0);
  assert.equal(off.startedAt, null);
});

test("opening the app or ticking alone is not continuous study", () => {
  let state = emptyBreakReminderState("home");
  state = update(state, "tick", 1000 * minute);
  state = update(state, "safe-point", 1001 * minute, 120, { key: "theory" });
  assert.equal(state.startedAt, null);
  assert.equal(state.pending, false);
  assert.equal(state.visible, false);
});

test("fifteen minutes of inactivity resets the session and stale pending reminder", () => {
  let state = studyFor(120);
  state = update(state, "tick", 135 * minute);
  assert.equal(state.startedAt, null);
  assert.equal(state.pending, false);
  state = update(state, "activity", 136 * minute);
  assert.equal(state.startedAt, 136 * minute);
  assert.equal(state.visible, false);
});

test("short background absences are excluded; long inactivity resets", () => {
  let state = studyFor(110);
  state = update(state, "pause", 111 * minute);
  state = update(state, "tick", 119 * minute);
  assert.equal(state.pending, false);
  state = update(state, "resume", 119 * minute);
  assert.equal(state.startedAt, 8 * minute);
  state = update(state, "activity", 120 * minute);
  assert.equal(state.pending, false);
  state = update(state, "activity", 128 * minute);
  assert.equal(state.pending, true);
  state = update(state, "pause", 129 * minute);
  state = update(state, "resume", 144 * minute);
  assert.equal(state.startedAt, null);
  assert.equal(state.pending, false);
});

test("background navigation cannot display a queued reminder", () => {
  let state = studyFor(120);
  state = update(state, "pause", 121 * minute);
  state = update(state, "safe-point", 122 * minute, 120, { key: "background-route" });
  assert.equal(state.visible, false);
  state = update(state, "resume", 123 * minute);
  state = update(state, "safe-point", 123 * minute, 120, { key: "background-route" });
  assert.equal(state.visible, false);
  state = update(state, "safe-point", 124 * minute, 120, { key: "next-real-check" });
  assert.equal(state.visible, true);
});

test("dismiss restarts the interval and cannot repeatedly show at every route", () => {
  let state = update(studyFor(120), "safe-point", 121 * minute, 120, { key: "checked" });
  state = update(state, "dismiss", 122 * minute);
  assert.equal(state.startedAt, 122 * minute);
  assert.equal(state.visible, false);
  state = update(state, "safe-point", 123 * minute, 120, { key: "next" });
  assert.equal(state.visible, false);
  assert.equal(state.pending, false);
  state = updateBreakReminder(state, { type: "reset", key: "profile" }, 120);
  assert.deepEqual(state, emptyBreakReminderState("profile"));
});

test("a clock anomaly and invalid time never create a reminder", () => {
  const original = update(emptyBreakReminderState(), "activity", minute);
  assert.equal(update(original, "tick", NaN), original);
  assert.equal(update(original, "tick", -1), original);
  const backwards = update(original, "activity", 0);
  assert.equal(backwards.startedAt, 0);
  assert.equal(backwards.pending, false);
});
