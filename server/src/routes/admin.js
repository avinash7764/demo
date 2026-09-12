import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, uniqueSlug, courseProgressFor } from '../db.js';
import { adminRequired } from '../auth.js';
import { UPLOAD_DIR } from '../stream.js';

const router = Router();
router.use(adminRequired);

// ---------- uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = file.fieldname === 'video' ? 'videos' : file.fieldname === 'notes' ? 'notes' : 'thumbs';
    const dir = path.join(UPLOAD_DIR, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // up to 2GB
});

// ---------- stats ----------
router.get('/stats', (req, res) => {
  const students = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'student'").get().c;
  const courses = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
  const lessons = db.prepare('SELECT COUNT(*) AS c FROM lessons').get().c;
  const enrollments = db.prepare('SELECT COUNT(*) AS c FROM enrollments').get().c;
  const completions = db
    .prepare(
      `SELECT COUNT(*) AS c FROM lesson_progress lp WHERE lp.completed = 1`
    )
    .get().c;
  res.json({ students, courses, lessons, enrollments, completions });
});

// ---------- courses ----------
router.get('/courses', (req, res) => {
  const { q } = req.query;
  const params = [];
  let where = '';
  if (q) {
    where = 'WHERE c.title LIKE ? OR c.instructor LIKE ? OR c.category LIKE ?';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
       FROM courses c ${where} ORDER BY c.created_at DESC`
    )
    .all(...params);
  res.json({ courses: rows });
});

router.get('/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const modules = db
    .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC, id ASC')
    .all(course.id);
  course.modules = modules.map((m) => ({
    ...m,
    lessons: db
      .prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC, id ASC')
      .all(m.id),
  }));
  res.json({ course });
});

router.post('/courses', upload.single('thumbnail'), (req, res) => {
  const { title, description, category, level, instructor, is_free, published } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Course title is required.' });
  const thumbnail = req.file ? `thumbs/${req.file.filename}` : null;
  const info = db
    .prepare(
      `INSERT INTO courses (title, slug, description, category, level, instructor, thumbnail, is_free, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      uniqueSlug(title),
      description || '',
      category || 'General',
      level || 'Beginner',
      instructor || '',
      thumbnail,
      is_free === 'false' || is_free === '0' ? 0 : 1,
      published === 'false' || published === '0' ? 0 : 1
    );
  res.status(201).json({ course: db.prepare('SELECT * FROM courses WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/courses/:id', upload.single('thumbnail'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const { title, description, category, level, instructor, is_free, published } = req.body || {};
  const thumbnail = req.file ? `thumbs/${req.file.filename}` : course.thumbnail;
  db.prepare(
    `UPDATE courses SET title = ?, description = ?, category = ?, level = ?, instructor = ?, thumbnail = ?, is_free = ?, published = ? WHERE id = ?`
  ).run(
    title?.trim() || course.title,
    description ?? course.description,
    category ?? course.category,
    level ?? course.level,
    instructor ?? course.instructor,
    thumbnail,
    is_free === undefined ? course.is_free : is_free === 'false' || is_free === '0' ? 0 : 1,
    published === undefined ? course.published : published === 'false' || published === '0' ? 0 : 1,
    course.id
  );
  res.json({ course: db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id) });
});

router.delete('/courses/:id', (req, res) => {
  // remove associated files
  const files = db
    .prepare(
      `SELECT video_path, notes_path FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`
    )
    .all(req.params.id);
  const thumb = db.prepare('SELECT thumbnail FROM courses WHERE id = ?').get(req.params.id);
  for (const f of files) {
    for (const p of [f.video_path, f.notes_path]) {
      if (p) fs.rm(path.join(UPLOAD_DIR, p), { force: true }, () => {});
    }
  }
  if (thumb?.thumbnail) fs.rm(path.join(UPLOAD_DIR, thumb.thumbnail), { force: true }, () => {});
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- modules ----------
router.post('/courses/:id/modules', (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Module title is required.' });
  const max = db.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM modules WHERE course_id = ?').get(req.params.id).m;
  const info = db
    .prepare('INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)')
    .run(req.params.id, title.trim(), max + 1);
  res.status(201).json({ module: db.prepare('SELECT * FROM modules WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/modules/:id', (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Module title is required.' });
  db.prepare('UPDATE modules SET title = ? WHERE id = ?').run(title.trim(), req.params.id);
  res.json({ module: db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id) });
});

router.delete('/modules/:id', (req, res) => {
  const files = db.prepare('SELECT video_path, notes_path FROM lessons WHERE module_id = ?').all(req.params.id);
  for (const f of files) {
    for (const p of [f.video_path, f.notes_path]) {
      if (p) fs.rm(path.join(UPLOAD_DIR, p), { force: true }, () => {});
    }
  }
  db.prepare('DELETE FROM modules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- lessons ----------
router.post('/modules/:id/lessons', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'notes', maxCount: 1 },
]), (req, res) => {
  const { title, description, duration_sec } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Lesson title is required.' });
  const video = req.files?.video?.[0];
  const notes = req.files?.notes?.[0];
  const max = db.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM lessons WHERE module_id = ?').get(req.params.id).m;
  const info = db
    .prepare(
      `INSERT INTO lessons (module_id, title, description, video_path, notes_path, notes_name, duration_sec, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.id,
      title.trim(),
      description || '',
      video ? `videos/${video.filename}` : null,
      notes ? `notes/${notes.filename}` : null,
      notes ? notes.originalname : null,
      parseInt(duration_sec, 10) || 0,
      max + 1
    );
  res.status(201).json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/lessons/:id', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'notes', maxCount: 1 },
]), (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const { title, description, duration_sec } = req.body || {};
  const video = req.files?.video?.[0];
  const notes = req.files?.notes?.[0];
  if (video && lesson.video_path) fs.rm(path.join(UPLOAD_DIR, lesson.video_path), { force: true }, () => {});
  if (notes && lesson.notes_path) fs.rm(path.join(UPLOAD_DIR, lesson.notes_path), { force: true }, () => {});
  db.prepare(
    `UPDATE lessons SET title = ?, description = ?, video_path = ?, notes_path = ?, notes_name = ?, duration_sec = ? WHERE id = ?`
  ).run(
    title?.trim() || lesson.title,
    description ?? lesson.description,
    video ? `videos/${video.filename}` : lesson.video_path,
    notes ? `notes/${notes.filename}` : lesson.notes_path,
    notes ? notes.originalname : lesson.notes_name,
    duration_sec === undefined ? lesson.duration_sec : parseInt(duration_sec, 10) || 0,
    lesson.id
  );
  res.json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(lesson.id) });
});

router.delete('/lessons/:id', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (lesson) {
    for (const p of [lesson.video_path, lesson.notes_path]) {
      if (p) fs.rm(path.join(UPLOAD_DIR, p), { force: true }, () => {});
    }
    db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
  }
  res.json({ ok: true });
});

// Reorder modules & lessons (batch).
router.put('/courses/:id/reorder', (req, res) => {
  const { modules = [] } = req.body || {};
  const tx = db.prepare('UPDATE modules SET position = ? WHERE id = ?');
  const txL = db.prepare('UPDATE lessons SET position = ? WHERE id = ?');
  modules.forEach((m, i) => {
    tx.run(i + 1, m.id);
    (m.lessons || []).forEach((l, j) => txL.run(j + 1, l));
  });
  res.json({ ok: true });
});

// ---------- reviews ----------
router.get('/reviews', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS student_name, u.email AS student_email,
              c.id AS course_id, c.title AS course_title
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN courses c ON c.id = r.course_id
       ORDER BY r.created_at DESC`
    )
    .all();
  res.json({ reviews: rows });
});

router.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- students ----------
router.get('/students', (req, res) => {
  const { q } = req.query;
  const params = ["student"];
  let where = "WHERE u.role = ?";
  if (q) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS course_count
       FROM users u ${where} ORDER BY u.created_at DESC`
    )
    .all(...params);
  res.json({ students: rows });
});

router.get('/students/:id', (req, res) => {
  const student = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ? AND role = 'student'").get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  const courses = db
    .prepare(
      `SELECT e.enrolled_at, c.* FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC`
    )
    .all(student.id)
    .map((c) => ({ ...c, progress: courseProgressFor(student.id, c.id) }));
  res.json({ student, courses });
});

router.delete('/students/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(req.params.id, 'student');
  res.json({ ok: true });
});

export default router;
