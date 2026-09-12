import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, 'learnhub.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',   -- 'admin' | 'student'
  avatar        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'General',
  level       TEXT NOT NULL DEFAULT 'Beginner',
  instructor  TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT,
  is_free     INTEGER NOT NULL DEFAULT 1,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id    INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  video_path   TEXT,
  notes_path   TEXT,
  notes_name   TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed     INTEGER NOT NULL DEFAULT 0,
  watched_sec   INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id)
);
`);

// ---------- lightweight migrations ----------
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}
if (!columnExists('enrollments', 'completed_at')) {
  db.exec(`ALTER TABLE enrollments ADD COLUMN completed_at TEXT;`);
}

// ---------- helper row mappers ----------
export function rowToUser(r) {
  if (!r) return null;
  const { password_hash, ...rest } = r;
  return rest;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'course';
}

export function uniqueSlug(base) {
  let slug = slugify(base);
  let n = 1;
  const exists = () =>
    db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug);
  while (exists()) slug = `${slugify(base)}-${++n}`;
  return slug;
}

export function courseProgressFor(userId, courseId) {
  const lessons = db
    .prepare(
      `SELECT l.id FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ?`
    )
    .all(courseId);
  if (lessons.length === 0) return 0;
  const done = db
    .prepare(
      `SELECT COUNT(*) AS c FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE lp.user_id = ? AND m.course_id = ? AND lp.completed = 1`
    )
    .get(userId, courseId).c;
  return Math.round((done / lessons.length) * 100);
}

// The most recently-watched lesson in a course (for "continue learning").
export function lastWatchedLesson(userId, courseId) {
  const row = db
    .prepare(
      `SELECT l.id, l.title, m.title AS module_title
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE lp.user_id = ? AND m.course_id = ?
       ORDER BY lp.updated_at DESC
       LIMIT 1`
    )
    .get(userId, courseId);
  return row || null;
}

// Average rating + review count for a course.
export function courseRating(courseId) {
  const r = db
    .prepare('SELECT AVG(rating) AS avg, COUNT(*) AS c FROM reviews WHERE course_id = ?')
    .get(courseId);
  return { average: r.avg ? Math.round(r.avg * 10) / 10 : 0, count: r.c };
}
