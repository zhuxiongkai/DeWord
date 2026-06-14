# 得背单词 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable first version of the personal Windows vocabulary app with active recall, spaced review, weak-word tracking, and local data persistence.

**Architecture:** Use a dependency-free Node server for local APIs and static frontend delivery. Keep scheduling logic in a small domain module that is tested independently from the UI. Store app data in JSON for the first version so the app is portable without native dependencies.

**Tech Stack:** Node.js built-ins, HTML, CSS, vanilla JavaScript, node:test.

---

### Task 1: Scheduling Domain

**Files:**
- Create: `src/domain/scheduler.js`
- Create: `tests/scheduler.test.js`

- [x] Write failing tests for Known, Fuzzy, Unknown, due filtering, and estimated time.
- [x] Implement the scheduler with a simplified SM-2 model.
- [x] Run `node --test tests/scheduler.test.js`.

### Task 2: Local Data Store

**Files:**
- Create: `src/data/store.js`
- Create: `data/seed-vocabulary.json`

- [x] Load app data from `data/app-data.json` if present.
- [x] Seed initial words from `data/seed-vocabulary.json`.
- [x] Persist review updates back to JSON.

### Task 3: Local Server

**Files:**
- Create: `server.js`

- [x] Serve static files from `public`.
- [x] Expose API endpoints for dashboard data, review queue, submitting review results, wordbooks, weak words, stats, settings, import, and export.

### Task 4: Frontend App

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

- [x] Implement the reference-inspired shell: sidebar, top search, main workspace, right summary rail.
- [x] Implement Today, Review Plan, Wordbook, Weak Words, Stats, and Settings views.
- [x] Connect Today study card to the local API.
- [x] Add keyboard shortcuts: Space for next/reveal, 1 Known, 2 Fuzzy, 3 Unknown, Enter reveal.

### Task 5: Verification

**Commands:**
- `node --test tests/scheduler.test.js`
- `node server.js`
- Open `http://127.0.0.1:4738`

- [x] Confirm tests pass.
- [x] Confirm the app starts and returns the main page.
- [x] Confirm review submission updates local data.
