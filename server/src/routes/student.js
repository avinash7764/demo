import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db, courseProgressFor } from '../db.js';
import { authRequired } from '../auth.js';
import { streamVideo, UPLOAD_DIR, mimeFor } from '../stream.js';

const router = Router();
router.use(authRequired);

// A student's enrolled courses with progress.
router.get('/my-courses', (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.enrolled_at, c.*,
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
  res.json({ progress: courseProgressFor(req.user.id, courseId), completed: done === 1 });
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
