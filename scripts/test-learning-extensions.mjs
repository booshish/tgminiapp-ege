import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentLoader } from './content-source-loader.mjs';
const load = createContentLoader();
const { tasks } = load('src/lib/tasks.ts');
const { emptyLearningState, parseLearningState, getAnalytics } = load('src/lib/learning-events.ts');
const { emptyGameState, getGameSummary } = load('src/lib/gamification.ts');
const { appendCheckedAnswer, appendMockSolutionExposure } = load('src/lib/learning-mutations.ts');
const { orderPracticeTasks } = load('src/lib/practice-order.ts');
const fresh = () => ({ ...emptyLearningState, events: [], legacyRecords: [], game: emptyGameState() });
const task = tasks.find((item) => item.id === 'triangle-sine');
const at = '2026-10-21T12:00:00.000Z';

test('A completed mock replays an answer ID without a second attempt, XP or streak', () => {
  const first = appendCheckedAnswer(fresh(), task, '0,8', true, 'mock-example-answer-15', false, at);
  assert.equal(first.xpAwarded, 1);
  const restored = parseLearningState(JSON.stringify(first.state));
  const repeat = appendCheckedAnswer(restored, task, '0,8', true, first.id, false, at);
  assert.equal(repeat.xpAwarded, 0);
  assert.equal(repeat.state, restored);
  assert.equal(repeat.state.events.length, 1);
  assert.equal(getGameSummary(repeat.state.game).totalXP, 1);
  assert.equal(getGameSummary(repeat.state.game).winStreak, 1);
  assert.throws(() => appendCheckedAnswer(restored, task, '0.5', false, first.id));
});

test('A skipped mock solution persists without inventing an answer, and blocks later XP', () => {
  const exposed = appendMockSolutionExposure(fresh(), task, 'mock-skipped', at);
  assert.equal(getAnalytics(exposed).attempts, 0);
  assert.equal(getGameSummary(exposed.game).winStreak, 0);
  assert.equal(appendMockSolutionExposure(exposed, task, 'mock-skipped'), exposed);
  const restored = parseLearningState(JSON.stringify(exposed));
  assert.equal(restored.events.length, 1);
  assert.equal(restored.events[0].source, 'completed-mock');
  assert.equal(restored.events[0].attemptId, undefined);
  const answer = appendCheckedAnswer(restored, task, '0.8', true, 'later-correct', false, '2026-10-21T12:01:00.000Z');
  assert.equal(answer.xpAwarded, 0);
  assert.equal(getGameSummary(answer.state.game).winStreak, 0);
  const roundtrip = parseLearningState(JSON.stringify(answer.state));
  assert.equal(roundtrip.game.xpEvents.length, 0);
});

test('The exposure extension does not accept arbitrary orphan solution events', () => {
  const state = appendMockSolutionExposure(fresh(), task, 'mock-skipped', at);
  const event = { ...state.events[0] };
  delete event.source;
  assert.equal(parseLearningState(JSON.stringify({ ...state, events: [event] })).events.length, 0);
  assert.throws(() => appendMockSolutionExposure(fresh(), tasks.find((item) => item.part === 2), 'mock-skipped'));
  assert.throws(() => appendCheckedAnswer(fresh(), task, 'wrong-text', true, 'bad-answer'));
});

test('A shuffle is reproducible, prioritizes unseen variants and never duplicates tasks', () => {
  const ids = Array.from({ length: 50 }, (_, index) => `variant-${index}`);
  const seen = ids.slice(0, 20);
  const first = orderPracticeTasks([...ids, ids[0]], 'session-a', seen);
  assert.equal(first.length, ids.length);
  assert.deepEqual(new Set(first), new Set(ids));
  assert.deepEqual(first, orderPracticeTasks(ids, 'session-a', seen));
  assert.notDeepEqual(first, orderPracticeTasks(ids, 'session-b', seen));
  assert.ok(first.slice(0, 30).every((id) => !seen.includes(id)));
  assert.ok(first.slice(30).every((id) => seen.includes(id)));
});
