# 得背单词 Product Plan

## Goal

Build a focused Windows vocabulary app for personal English study. The app should make daily study efficient by combining active recall, spaced repetition, and automatic weak-word practice.

## Evidence-Based Learning Model

The first version uses three learning rules:

1. Active recall first: show the English word and pronunciation before showing Chinese meaning, example, or etymology.
2. Spaced review: every response updates the next review date instead of treating all words equally.
3. Error weighting: words marked "fuzzy" or "unknown" return sooner and appear in the weak-word queue.

Sources used for the learning model:

- Dunlosky et al., "Improving Students' Learning With Effective Learning Techniques": practice testing and distributed practice have high utility.
- AERO, "Spacing and retrieval practice guide": spacing and retrieval help learners keep information longer.
- SuperMemo SM-2 description: a simple and proven interval update model using repetitions, interval, and easiness.
- FSRS project: a future upgrade path for a more adaptive scheduler once enough personal review data exists.

## MVP Scope

### Keep

- Left navigation similar to the reference images.
- Today study page with a large word card.
- Review plan page focused on due words and estimated time.
- Wordbook import and management.
- Weak words page.
- Study statistics page with only useful metrics.
- Settings for daily goals, pronunciation, keyboard shortcuts, and backup/export.

### Remove or Defer

- Decorative memory curve charts that do not affect review behavior.
- Detailed morning/afternoon/evening scheduling in the first version.
- Many built-in exam libraries.
- Theme customization beyond a clean light mode.
- Complex preference summaries.

## Core User Flow

1. User opens the app.
2. The Today page shows due review count, new-word goal, and one primary button.
3. A study card shows only the English word, phonetic text, and audio button.
4. User tries to recall the meaning.
5. User presses Enter to reveal meaning, example, and etymology.
6. User marks the card as Known, Fuzzy, or Unknown.
7. The scheduler updates interval, ease, due date, mistake count, and mastery status.
8. The next card appears automatically.

## Data Model

Each word stores:

- id
- word
- phonetic
- meaning
- partOfSpeech
- example
- exampleTranslation
- etymology
- bookId
- createdAt

Each progress record stores:

- wordId
- status: new, learning, review, mastered
- repetitions
- intervalDays
- easeFactor
- dueDate
- lastReviewedAt
- mistakeCount
- fuzzyCount
- knownCount

## First Technical Target

The current machine has the bundled Node.js runtime available, but npm, git, cargo, and Tauri are not available on PATH. The first implementation will therefore be a local desktop-style web app powered by Node's built-in HTTP server and static HTML/CSS/JavaScript.

This gives us a working offline app immediately. Later, the same UI and logic can be wrapped with Tauri or Electron for a true Windows installer.

