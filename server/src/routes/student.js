import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, courseProgressFor, lastWatchedLesson } from '../db.js';
import { authRequired } from '../auth.js';
import { streamVideo, UPLOAD_DIR, mimeFor } from '../stream.js';

const router = Router();
router.use(authRequired);

// ---------- profile ----------
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', (req, res) => {
  const stats = {
    enrolled: db.prepare('SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ?').get(req.user.id).c,
    completed: db
      .prepare('SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ? AND completed_at IS NOT NULL')
      .get(req.user.id).c,
    lessonsDone: db
      .prepare('SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = ? AND completed = 1')
      .get(req.user.id).c,
    minutesWatched: Math.round(
      (db.prepare('SELECT COALESCE(SUM(watched_sec), 0) AS s FROM lesson_progress WHERE user_id = ?').get(req.user.id).s) / 60
    ),
  };
  res.json({ user: req.user, stats });
});

router.put('/profile', avatarUpload.single('avatar'), (req, res) => {
  const { name } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const avatar = req.file ? `avatars/${req.file.filename}` : user.avatar;
  const newName = (name?.trim() || user.name).slice(0, 80);
  db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(newName, avatar, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const { password_hash, ...rest } = updated;
  res.json({ user: rest });
});

// A student's enrolled courses with progress + resume info.
router.get('/my-courses', (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.enrolled_at, e.completed_at, c.*,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`
    )
    .all(req.user.id);
  const courses = rows.map((c) => ({
    ...c,
    progress: courseProgressFor(req.user.id, c.id),
    last_lesson: lastWatchedLesson(req.user.id, c.id),
  }));
  res.json({ courses });
});

// Enroll in a course.
router.post('/courses/:id/enroll', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course || !course.published) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  const existing = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, course.id);
  if (existing) return res.json({ enrolled: true, message: 'Already enrolled.' });
  db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(
    req.user.id,
    course.id
  );
  res.json({ enrolled: true });
});

// Unenroll.
router.delete('/courses/:id/enroll', (req, res) => {
  db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(
    req.user.id,
    req.params.id
  );
  res.json({ enrolled: false });
});

// Report watch progress for a lesson.
router.post('/lessons/:id/progress', (req, res) => {
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const { watched_sec = 0, completed = false } = req.body || {};
  const done = completed ? 1 : 0;
  const existing = db
    .prepare('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(req.user.id, lesson.id);
  if (existing) {
    db.prepare(
      'UPDATE lesson_progress SET watched_sec = MAX(watched_sec, ?), completed = MAX(completed, ?), updated_at = datetime(\'now\') WHERE id = ?'
    ).run(Math.max(0, watched_sec || 0), done, existing.id);
  } else {
    db.prepare(
      'INSERT INTO lesson_progress (user_id, lesson_id, watched_sec, completed) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, lesson.id, Math.max(0, watched_sec || 0), done);
  }
  // Work out overall course progress for the response.
  const courseId = db
    .prepare(
      'SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?'
    )
    .get(lesson.id).course_id;
  const progress = courseProgressFor(req.user.id, courseId);

  // Stamp the completion date the first time the course reaches 100%.
  if (progress >= 100) {
    db.prepare(
      `UPDATE enrollments SET completed_at = COALESCE(completed_at, datetime('now'))
       WHERE user_id = ? AND course_id = ?`
    ).run(req.user.id, courseId);
  }
  res.json({ progress, completed: done === 1 });
});

// Stream a lesson video (Range support).
router.get('/lessons/:id/stream', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const courseId = db
    .prepare('SELECT course_id FROM modules WHERE id = ?')
    .get(lesson.module_id)?.course_id;
  if (!courseId) return res.status(404).json({ error: 'Module not found.' });
  // Must be enrolled (admins can preview regardless).
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, courseId);
  if (!enrolled && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Enroll in this course to watch.' });
  }
  if (!lesson.video_path) return res.status(404).json({ error: 'No video for this lesson.' });
  const filePath = path.resolve(UPLOAD_DIR, lesson.video_path);
  streamVideo(filePath, req, res);
});

// ---------- bookmarks / wishlist ----------
router.get('/bookmarks', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, b.created_at AS bookmarked_at,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
        (SELECT AVG(rating) FROM reviews r WHERE r.course_id = c.id) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id) AS review_count
       FROM bookmarks b JOIN courses c ON c.id = b.course_id
       WHERE b.user_id = ? AND c.published = 1
       ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json({ courses: rows });
});

router.post('/courses/:id/bookmark', (req, res) => {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND published = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const existing = db
    .prepare('SELECT id FROM bookmarks WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, course.id);
  if (!existing) {
    db.prepare('INSERT INTO bookmarks (user_id, course_id) VALUES (?, ?)').run(req.user.id, course.id);
  }
  res.json({ bookmarked: true });
});

router.delete('/courses/:id/bookmark', (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND course_id = ?').run(req.user.id, req.params.id);
  res.json({ bookmarked: false });
});

// ---------- quizzes ----------
// Get a lesson's quiz (questions WITHOUT correct answers) + best result.
router.get('/lessons/:id/quiz', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'No quiz for this lesson.' });
  const questions = db
    .prepare('SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC, id ASC')
    .all(quiz.id);
  const best = db
    .prepare('SELECT MAX(score) AS best, MAX(passed) AS passed FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?')
    .get(req.user.id, quiz.id);
  const attempts = db
    .prepare('SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?')
    .get(req.user.id, quiz.id).c;
  res.json({ quiz, questions, best: best.best ?? null, passed: !!best.passed, attempts });
});

router.post('/lessons/:id/quiz/submit', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'No quiz for this lesson.' });
  const questions = db
    .prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC, id ASC')
    .all(quiz.id);
  if (questions.length === 0) return res.status(400).json({ error: 'This quiz has no questions.' });
  const answers = req.body?.answers || {};
  let correctCount = 0;
  const results = questions.map((q) => {
    const chosen = answers[q.id] || null;
    const isCorrect = chosen === q.correct;
    if (isCorrect) correctCount++;
    return { id: q.id, correct: q.correct, chosen, isCorrect };
  });
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.pass_percent ? 1 : 0;
  db.prepare('INSERT INTO quiz_attempts (user_id, quiz_id, score, passed) VALUES (?, ?, ?, ?)')
    .run(req.user.id, quiz.id, score, passed);
  res.json({ score, passed: !!passed, pass_percent: quiz.pass_percent, total: questions.length, correct: correctCount, results });
});

// ---------- discussions ----------
router.get('/lessons/:id/discussions', (req, res) => {
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const rows = db
    .prepare(
      `SELECT d.id, d.body, d.parent_id, d.created_at, u.id AS user_id, u.name AS author, u.avatar
       FROM discussions d JOIN users u ON u.id = d.user_id
       WHERE d.lesson_id = ? ORDER BY d.created_at ASC`
    )
    .all(lesson.id);
  const threads = [];
  const replies = {};
  for (const r of rows) {
    if (!r.parent_id) threads.push(r);
    else (replies[r.parent_id] ||= []).push(r);
  }
  res.json({ threads, replies });
});

router.post('/lessons/:id/discussions', (req, res) => {
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const { body, parent_id } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Message cannot be empty.' });
  const parent = parent_id
    ? db.prepare('SELECT id FROM discussions WHERE id = ? AND lesson_id = ?').get(parent_id, lesson.id)
    : null;
  if (parent_id && !parent) return res.status(404).json({ error: 'Reply target not found.' });
  const info = db
    .prepare('INSERT INTO discussions (lesson_id, user_id, parent_id, body) VALUES (?, ?, ?, ?)')
    .run(lesson.id, req.user.id, parent ? parent.id : null, String(body).trim().slice(0, 2000));
  const created = db
    .prepare('SELECT d.*, u.name AS author, u.avatar FROM discussions d JOIN users u ON u.id = d.user_id WHERE d.id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ discussion: created });
});

// ---------- announcements ----------
router.get('/announcements', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.body, a.created_at, u.name AS author
       FROM announcements a JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 20`
    )
    .all();
  res.json({ announcements: rows });
});

// ---------- reviews ----------
router.get('/courses/:id/review', (req, res) => {
  const review = db
    .prepare('SELECT * FROM reviews WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, req.params.id);
  res.json({ review: review || null });
});

router.post('/courses/:id/review', (req, res) => {
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, course.id);
  if (!enrolled) {
    return res.status(403).json({ error: 'Enroll in this course to leave a review.' });
  }
  const { rating, comment = '' } = req.body || {};
  const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
  const existing = db
    .prepare('SELECT id FROM reviews WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, course.id);
  if (existing) {
    db.prepare('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?').run(r, String(comment).slice(0, 2000), existing.id);
  } else {
    db.prepare('INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)')
      .run(req.user.id, course.id, r, String(comment).slice(0, 2000));
  }
  const review = db
    .prepare('SELECT * FROM reviews WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, course.id);
  res.json({ review });
});

router.delete('/courses/:id/review', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE user_id = ? AND course_id = ?').run(req.user.id, req.params.id);
  res.json({ ok: true });
});

// Inline preview of text-based notes (markdown / text). Returns { preview, type }
// for text files, or { binary: true } for PDF/DOC/etc.
router.get('/lessons/:id/notes-preview', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson || !lesson.notes_path) {
    return res.status(404).json({ error: 'No notes for this lesson.' });
  }
  const courseId = db
    .prepare('SELECT course_id FROM modules WHERE id = ?')
    .get(lesson.module_id)?.course_id;
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, courseId);
  if (!enrolled && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Enroll in this course to view notes.' });
  }
  const filePath = path.resolve(UPLOAD_DIR, lesson.notes_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Notes file not found.' });
  }
  const ext = path.extname(lesson.notes_path).toLowerCase();
  const TEXT_EXTS = ['.md', '.markdown', '.txt', '.text', '.html', '.htm', '.csv', '.json'];
  if (!TEXT_EXTS.includes(ext)) {
    return res.json({ binary: true, name: lesson.notes_name || path.basename(lesson.notes_path) });
  }
  const preview = fs.readFileSync(filePath, 'utf8').slice(0, 20000);
  res.json({ binary: false, preview, type: ext.replace('.', '') || 'text', name: lesson.notes_name || path.basename(lesson.notes_path) });
});

// Download lesson notes.
router.get('/lessons/:id/notes', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson || !lesson.notes_path) {
    return res.status(404).json({ error: 'No notes for this lesson.' });
  }
  const courseId = db
    .prepare('SELECT course_id FROM modules WHERE id = ?')
    .get(lesson.module_id)?.course_id;
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(req.user.id, courseId);
  if (!enrolled && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Enroll in this course to download notes.' });
  }
  const filePath = path.resolve(UPLOAD_DIR, lesson.notes_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Notes file not found.' });
  }
  res.download(filePath, lesson.notes_name || path.basename(lesson.notes_path), (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Could not download file.' });
    }
  });
});

export default router;
