import { Router } from 'express';
import { db, courseProgressFor } from '../db.js';
import { optionalAuth } from '../auth.js';

const router = Router();

// Build a full course object including modules & lessons, personalised for userId (optional).
export function fullCourse(id, userId) {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course) return null;
  const modules = db
    .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC, id ASC')
    .all(id);
  const lessonStmt = db.prepare(
    'SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC, id ASC'
  );
  const progressStmt = db.prepare(
    'SELECT completed, watched_sec FROM lesson_progress WHERE user_id = ? AND lesson_id = ?'
  );
  const totalLessons = db
    .prepare(
      'SELECT COUNT(*) AS c FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?'
    )
    .get(id).c;

  course.modules = modules.map((m) => {
    const lessons = lessonStmt.all(m.id).map((l) => {
      const p = userId ? progressStmt.get(userId, l.id) : null;
      return {
        ...l,
        completed: p ? !!p.completed : false,
        watched_sec: p ? p.watched_sec : 0,
      };
    });
    return { ...m, lessons };
  });
  course.total_lessons = totalLessons;
  course.enrolled = userId
    ? !!db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, id)
    : false;
  course.progress = userId ? courseProgressFor(userId, id) : 0;
  return course;
}

// Public catalog listing.
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
       FROM courses c
       WHERE c.published = 1
       ORDER BY c.created_at DESC`
    )
    .all();
  res.json({ courses: rows });
});

// Course detail (personalised if logged in).
router.get('/:id', optionalAuth, (req, res) => {
  const course = fullCourse(Number(req.params.id), req.user?.id || null);
  if (!course || !course.published) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  res.json({ course });
});

export default router;
