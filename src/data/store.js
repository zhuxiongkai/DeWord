import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { applyReviewResult, buildReviewQueue, createInitialProgress, estimateMinutes, getTodayKey } from "../domain/scheduler.js";

const DEFAULT_SETTINGS = {
  newWordGoal: 12,
  reviewLimit: 80,
  reminderTime: "19:00",
  pronunciation: "us",
  autoSpeak: false
};

export class WordStore {
  constructor(options = {}) {
    this.rootDir = options.rootDir ?? process.cwd();
    this.dataDir = path.join(this.rootDir, "data");
    this.appDataPath = path.join(this.dataDir, "app-data.json");
    this.seedPath = path.join(this.dataDir, "seed-vocabulary.json");
    this.data = null;
  }

  async load() {
    await mkdir(this.dataDir, { recursive: true });

    if (existsSync(this.appDataPath)) {
      this.data = JSON.parse(await readFile(this.appDataPath, "utf8"));
      return this.data;
    }

    const words = JSON.parse(await readFile(this.seedPath, "utf8"));
    const now = new Date();
    this.data = {
      version: 1,
      books: [
        {
          id: "cet4-core",
          name: "四级核心词汇",
          description: "用于开箱体验的核心词样例，后续可导入完整词库。",
          type: "built-in"
        }
      ],
      words,
      progress: {},
      sessions: [],
      settings: DEFAULT_SETTINGS,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    for (const word of words) {
      this.data.progress[word.id] = createInitialProgress(word.id, now);
    }

    await this.save();
    return this.data;
  }

  async save() {
    this.data.updatedAt = new Date().toISOString();
    await writeFile(this.appDataPath, `${JSON.stringify(this.data, null, 2)}\n`, "utf8");
  }

  async getDashboard(now = new Date()) {
    await this.ensureLoaded();
    const queue = this.getQueue(now);
    const stats = this.getStats(now);
    const reviewCount = queue.filter((item) => item.queueReason !== "new").length;
    const newCount = queue.filter((item) => item.queueReason === "new").length;

    return {
      today: getTodayKey(now),
      settings: this.data.settings,
      queue,
      stats,
      estimateMinutes: estimateMinutes({ reviewCount, newCount }),
      books: this.getBooks()
    };
  }

  getQueue(now = new Date()) {
    const settings = this.data.settings;
    return buildReviewQueue(this.data.words, this.data.progress, {
      today: now,
      newWordLimit: settings.newWordGoal,
      reviewLimit: settings.reviewLimit
    });
  }

  async submitReview(wordId, grade, now = new Date()) {
    await this.ensureLoaded();
    const current = this.data.progress[wordId] ?? createInitialProgress(wordId, now);
    this.data.progress[wordId] = applyReviewResult(current, grade, now);
    this.data.sessions.push({
      id: `${Date.now()}-${wordId}`,
      wordId,
      grade,
      reviewedAt: now.toISOString()
    });
    await this.save();
    return this.getDashboard(now);
  }

  async updateSettings(settings) {
    await this.ensureLoaded();
    this.data.settings = {
      ...this.data.settings,
      ...pickSettings(settings)
    };
    await this.save();
    return this.data.settings;
  }

  async importWords(words, bookName = "自定义词库") {
    await this.ensureLoaded();
    const bookId = `custom-${Date.now()}`;
    const normalized = words
      .map((word, index) => normalizeWord(word, bookId, index))
      .filter(Boolean);

    this.data.books.push({
      id: bookId,
      name: bookName,
      description: "用户导入的自定义词库",
      type: "custom"
    });

    for (const word of normalized) {
      if (this.data.words.some((item) => item.id === word.id)) continue;
      this.data.words.push(word);
      this.data.progress[word.id] = createInitialProgress(word.id);
    }

    await this.save();
    return { imported: normalized.length, bookId };
  }

  getBooks() {
    return this.data.books.map((book) => {
      const words = this.data.words.filter((word) => word.bookId === book.id);
      const learned = words.filter((word) => {
        const progress = this.data.progress[word.id];
        return progress && progress.status !== "new";
      }).length;

      return {
        ...book,
        total: words.length,
        learned,
        progressRate: words.length ? Math.round((learned / words.length) * 100) : 0
      };
    });
  }

  getWeakWords() {
    return this.data.words
      .map((word) => ({ ...word, progress: this.data.progress[word.id] }))
      .filter((word) => word.progress?.mistakeCount > 0 || word.progress?.fuzzyCount > 0)
      .sort((a, b) => b.progress.mistakeCount - a.progress.mistakeCount);
  }

  getStats(now = new Date()) {
    const today = getTodayKey(now);
    const sessionsToday = this.data.sessions.filter((session) => getTodayKey(new Date(session.reviewedAt)) === today);
    const knownToday = sessionsToday.filter((session) => session.grade === "known").length;
    const learned = Object.values(this.data.progress).filter((item) => item.status !== "new").length;
    const mastered = Object.values(this.data.progress).filter((item) => item.status === "mastered").length;
    const weak = this.getWeakWords().length;
    const due = this.data.words.filter((word) => this.data.progress[word.id]?.dueDate <= today).length;
    const newToday = sessionsToday.filter((session) => {
      const first = this.data.sessions.find((item) => item.wordId === session.wordId);
      return first?.id === session.id;
    }).length;

    return {
      totalWords: this.data.words.length,
      learned,
      mastered,
      weak,
      due,
      reviewedToday: sessionsToday.length,
      knownToday,
      accuracyToday: sessionsToday.length ? Math.round((knownToday / sessionsToday.length) * 100) : 0,
      newToday,
      streakDays: countStreakDays(this.data.sessions, now),
      heatmap: buildHeatmap(this.data.sessions, now)
    };
  }

  async ensureLoaded() {
    if (!this.data) await this.load();
  }
}

function pickSettings(input) {
  const next = {};
  if (Number.isFinite(Number(input.newWordGoal))) next.newWordGoal = Math.max(0, Math.min(100, Number(input.newWordGoal)));
  if (Number.isFinite(Number(input.reviewLimit))) next.reviewLimit = Math.max(1, Math.min(300, Number(input.reviewLimit)));
  if (typeof input.reminderTime === "string") next.reminderTime = input.reminderTime.slice(0, 5);
  if (["us", "uk"].includes(input.pronunciation)) next.pronunciation = input.pronunciation;
  if (typeof input.autoSpeak === "boolean") next.autoSpeak = input.autoSpeak;
  return next;
}

function normalizeWord(input, bookId, index) {
  if (!input || !input.word) return null;
  const cleanWord = String(input.word).trim();
  if (!cleanWord) return null;
  return {
    id: `${bookId}-${cleanWord.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    word: cleanWord,
    phonetic: input.phonetic ?? "",
    partOfSpeech: input.partOfSpeech ?? "",
    meaning: input.meaning ?? input.translation ?? "",
    example: input.example ?? "",
    exampleTranslation: input.exampleTranslation ?? "",
    etymology: input.etymology ?? "",
    bookId
  };
}

function countStreakDays(sessions, now) {
  const reviewedDays = new Set(sessions.map((session) => getTodayKey(new Date(session.reviewedAt))));
  let streak = 0;
  const cursor = new Date(now);

  while (reviewedDays.has(getTodayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildHeatmap(sessions, now) {
  const counts = new Map();
  for (const session of sessions) {
    const key = getTodayKey(new Date(session.reviewedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days = [];
  const cursor = new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000);
  for (let index = 0; index < 56; index += 1) {
    const key = getTodayKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

