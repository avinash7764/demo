import { Router } from 'express';
import { db, courseProgressFor, courseRating } from '../db.js';
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
  const enrollment = userId
    ? db.prepare('SELECT completed_at FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, id)
    : null;
  course.enrolled = !!enrollment;
  course.completed_at = enrollment?.completed_at || null;
  course.progress = userId ? courseProgressFor(userId, id) : 0;
  course.rating = courseRating(id);
  course.bookmarked = userId
    ? !!db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND course_id = ?').get(userId, id)
    : false;
  return course;
}

// Distinct categories with course counts (published courses only).
router.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.category,
        COUNT(*) AS course_count,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c2 ON c2.id = e.course_id WHERE c2.category = c.category) AS student_count
       FROM courses c WHERE c.published = 1
       GROUP BY c.category ORDER BY course_count DESC`
    )
    .all();
  res.json({ categories: rows });
});

// Instructors with aggregated stats.
router.get('/instructors', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.instructor AS name,
        COUNT(*) AS course_count,
        SUM((SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)) AS student_count,
        AVG((SELECT AVG(rating) FROM reviews r WHERE r.course_id = c.id)) AS avg_rating,
        SUM((SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id)) AS review_count
       FROM courses c
       WHERE c.published = 1 AND c.instructor != ''
       GROUP BY c.instructor ORDER BY student_count DESC, course_count DESC`
    )
    .all()
    .map((r) => ({
      ...r,
      avg_rating: r.avg_rating ? Math.round(r.avg_rating * 10) / 10 : 0,
      review_count: r.review_count || 0,
    }));
  res.json({ instructors: rows });
});

// Public catalog listing with optional search, filters & sorting
// (personalised bookmark state if logged in).
router.get('/', optionalAuth, (req, res) => {
  const { q, category, level, free, sort } = req.query;
  const clauses = ['c.published = 1'];
  const params = [];
  if (q) {
    clauses.push('(c.title LIKE ? OR c.description LIKE ? OR c.instructor LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category && category !== 'all') {
    clauses.push('c.category = ?');
    params.push(category);
  }
  if (level && level !== 'all') {
    clauses.push('c.level = ?');
    params.push(level);
  }
  if (free === '1') clauses.push('c.is_free = 1');
  if (free === '0') clauses.push('c.is_free = 0');

  // Sorting: newest (default) | popular (most enrollments) | rating (best reviews)
  const orderBy = {
    popular: 'student_count DESC, c.created_at DESC',
    rating: 'avg_rating DESC, review_count DESC, c.created_at DESC',
    newest: 'c.created_at DESC',
  }[sort] || 'c.created_at DESC';

  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
        (SELECT AVG(rating) FROM reviews r WHERE r.course_id = c.id) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id) AS review_count
       FROM courses c
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}`
    )
    .all(...params);

  if (req.user) {
    const bookmarkedIds = new Set(
      db.prepare('SELECT course_id FROM bookmarks WHERE user_id = ?').all(req.user.id).map((r) => r.course_id)
    );
    rows.forEach((c) => (c.bookmarked = bookmarkedIds.has(c.id)));
  }
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

// Public list of reviews for a course.
router.get('/:id/reviews', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS author, u.avatar
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.course_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(req.params.id);
  res.json({ reviews: rows });
});

export default router;
