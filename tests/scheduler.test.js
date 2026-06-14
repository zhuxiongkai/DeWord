import test from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewResult,
  buildReviewQueue,
  estimateMinutes,
  getTodayKey
} from "../src/domain/scheduler.js";

const today = new Date("2026-06-13T09:00:00.000Z");

function progress(overrides = {}) {
  return {
    wordId: "abandon",
    status: "new",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    dueDate: "2026-06-13",
    lastReviewedAt: null,
    mistakeCount: 0,
    fuzzyCount: 0,
    knownCount: 0,
    ...overrides
  };
}

test("known review graduates a new word to tomorrow with one repetition", () => {
  const result = applyReviewResult(progress(), "known", today);

  assert.equal(result.status, "review");
  assert.equal(result.repetitions, 1);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.dueDate, "2026-06-14");
  assert.equal(result.knownCount, 1);
  assert.equal(result.mistakeCount, 0);
  assert.ok(result.easeFactor > 2.5);
});

test("second known review schedules the card six days later", () => {
  const result = applyReviewResult(
    progress({ status: "review", repetitions: 1, intervalDays: 1, dueDate: "2026-06-13" }),
    "known",
    today
  );

  assert.equal(result.repetitions, 2);
  assert.equal(result.intervalDays, 6);
  assert.equal(result.dueDate, "2026-06-19");
});

test("fuzzy review keeps the word in learning and returns it soon", () => {
  const result = applyReviewResult(
    progress({ status: "review", repetitions: 3, intervalDays: 12, easeFactor: 2.3 }),
    "fuzzy",
    today
  );

  assert.equal(result.status, "learning");
  assert.equal(result.repetitions, 0);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.dueDate, "2026-06-14");
  assert.equal(result.fuzzyCount, 1);
  assert.equal(result.mistakeCount, 1);
  assert.ok(result.easeFactor < 2.3);
});

test("unknown review resets the interval and increases mistake count more strongly", () => {
  const result = applyReviewResult(
    progress({ status: "review", repetitions: 4, intervalDays: 20, easeFactor: 2.4 }),
    "unknown",
    today
  );

  assert.equal(result.status, "learning");
  assert.equal(result.repetitions, 0);
  assert.equal(result.intervalDays, 0);
  assert.equal(result.dueDate, "2026-06-13");
  assert.equal(result.mistakeCount, 2);
  assert.ok(result.easeFactor < 2.0);
});

test("review queue prioritizes due reviews, weak words, then new words up to daily goal", () => {
  const words = [
    { id: "due-hard", word: "derive" },
    { id: "new-one", word: "allocate" },
    { id: "future", word: "convey" },
    { id: "due-easy", word: "abandon" },
    { id: "new-two", word: "beneath" }
  ];
  const progressByWord = {
    "due-hard": progress({ wordId: "due-hard", status: "learning", dueDate: "2026-06-12", mistakeCount: 5 }),
    future: progress({ wordId: "future", status: "review", dueDate: "2026-07-01" }),
    "due-easy": progress({ wordId: "due-easy", status: "review", dueDate: "2026-06-13", mistakeCount: 0 })
  };

  const queue = buildReviewQueue(words, progressByWord, {
    today,
    newWordLimit: 1,
    reviewLimit: 20
  });

  assert.deepEqual(queue.map((item) => item.id), ["due-hard", "due-easy", "new-one"]);
});

test("estimated minutes uses 25 seconds per review and 50 seconds per new card", () => {
  assert.equal(estimateMinutes({ reviewCount: 30, newCount: 12 }), 23);
});

test("today key uses local calendar date format", () => {
  assert.equal(getTodayKey(new Date("2026-06-13T23:59:00+08:00")), "2026-06-13");
});

