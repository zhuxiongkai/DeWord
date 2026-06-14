const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export function getTodayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function addDaysKey(date, days) {
  const base = new Date(`${getTodayKey(date)}T00:00:00.000`);
  base.setDate(base.getDate() + days);
  return getTodayKey(base);
}

export function createInitialProgress(wordId, now = new Date()) {
  return {
    wordId,
    status: "new",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    dueDate: getTodayKey(now),
    lastReviewedAt: null,
    mistakeCount: 0,
    fuzzyCount: 0,
    knownCount: 0
  };
}

export function applyReviewResult(progress, grade, now = new Date()) {
  if (!["known", "fuzzy", "unknown"].includes(grade)) {
    throw new Error(`Unsupported review grade: ${grade}`);
  }

  const next = {
    ...progress,
    lastReviewedAt: now.toISOString()
  };

  if (grade === "known") {
    next.knownCount += 1;
    next.status = "review";
    next.repetitions += 1;
    next.easeFactor = roundEase(next.easeFactor + 0.08);
    next.intervalDays = next.repetitions === 1
      ? 1
      : next.repetitions === 2
        ? 6
        : Math.max(1, Math.round(next.intervalDays * next.easeFactor));
    next.dueDate = addDaysKey(now, next.intervalDays);
    return next;
  }

  if (grade === "fuzzy") {
    next.fuzzyCount += 1;
    next.mistakeCount += 1;
    next.status = "learning";
    next.repetitions = 0;
    next.intervalDays = 1;
    next.easeFactor = roundEase(Math.max(MIN_EASE, next.easeFactor - 0.22));
    next.dueDate = addDaysKey(now, 1);
    return next;
  }

  next.mistakeCount += 2;
  next.status = "learning";
  next.repetitions = 0;
  next.intervalDays = 0;
  next.easeFactor = roundEase(Math.max(MIN_EASE, next.easeFactor - 0.55));
  next.dueDate = getTodayKey(now);
  return next;
}

export function buildReviewQueue(words, progressByWord = {}, options = {}) {
  const today = getTodayKey(options.today ?? new Date());
  const newWordLimit = options.newWordLimit ?? 12;
  const reviewLimit = options.reviewLimit ?? 80;

  const due = [];
  const fresh = [];

  for (const word of words) {
    const progress = progressByWord[word.id];
    if (!progress) {
      fresh.push({ ...word, queueReason: "new", progress: createInitialProgress(word.id, options.today) });
      continue;
    }

    if (progress.dueDate <= today && progress.status !== "mastered") {
      due.push({ ...word, queueReason: progress.mistakeCount > 0 ? "weak" : "due", progress });
    }
  }

  due.sort((a, b) => {
    const mistakeDelta = b.progress.mistakeCount - a.progress.mistakeCount;
    if (mistakeDelta !== 0) return mistakeDelta;
    const dueDelta = a.progress.dueDate.localeCompare(b.progress.dueDate);
    if (dueDelta !== 0) return dueDelta;
    return a.word.localeCompare(b.word);
  });

  fresh.sort((a, b) => a.word.localeCompare(b.word));
  return [...due.slice(0, reviewLimit), ...fresh.slice(0, newWordLimit)];
}

export function estimateMinutes({ reviewCount = 0, newCount = 0 }) {
  const seconds = reviewCount * 25 + newCount * 50;
  return Math.max(1, Math.ceil(seconds / 60));
}

function roundEase(value) {
  return Math.round(value * 100) / 100;
}

