import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, uniqueSlug } from './db.js';
import { UPLOAD_DIR } from './stream.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_ASSETS = path.join(__dirname, '..', 'assets', 'seed');

function upsertUser(name, email, password, role) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10), role);
  return info.lastInsertRowid;
}

function copyThumb(name) {
  const src = path.join(SEED_ASSETS, name);
  if (!fs.existsSync(src)) return null;
  const dir = path.join(UPLOAD_DIR, 'thumbs');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, name);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  return `thumbs/${name}`;
}

function writeNote(relPath, content) {
  const dest = path.join(UPLOAD_DIR, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, content, 'utf8');
  return relPath;
}

function copyVideo(name) {
  const src = path.join(SEED_ASSETS, name);
  if (!fs.existsSync(src)) return null;
  const dir = path.join(UPLOAD_DIR, 'videos');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, name);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  return `videos/${name}`;
}

function addCourse({ title, description, category, level, instructor, thumb, video, modules }) {
  const existing = db.prepare('SELECT id FROM courses WHERE title = ?').get(title);
  if (existing) return existing.id;
  const thumbPath = copyThumb(thumb);
  const videoPath = copyVideo(video);
  const info = db
    .prepare(
      `INSERT INTO courses (title, slug, description, category, level, instructor, thumbnail, is_free, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`
    )
    .run(title, uniqueSlug(title), description, category, level, instructor, thumbPath);
  const courseId = info.lastInsertRowid;

  modules.forEach((m, mi) => {
    const minfo = db
      .prepare('INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)')
      .run(courseId, m.title, mi + 1);
    m.lessons.forEach((l, li) => {
      const notesPath = l.notes
        ? writeNote(`notes/${slug(l.title)}.md`, l.notes)
        : null;
      // Give the first lesson of each module a sample video; leave others
      // without one to show the "no video yet" state admins can fill in.
      const lessonVideo = li === 0 ? videoPath : null;
      db.prepare(
        `INSERT INTO lessons (module_id, title, description, video_path, notes_path, notes_name, duration_sec, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        minfo.lastInsertRowid,
        l.title,
        l.description || '',
        lessonVideo,
        notesPath,
        notesPath ? path.basename(notesPath) : null,
        l.duration || 0,
        li + 1
      );
    });
  });
  return courseId;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function run() {
  console.log('Seeding database…');

  const adminId = upsertUser('Admin', process.env.ADMIN_EMAIL || 'admin@learnhub.com', process.env.ADMIN_PASSWORD || 'admin123', 'admin');
  const studentId = upsertUser('Aarav Sharma', 'student@learnhub.com', 'student123', 'student');
  upsertUser('Priya Patel', 'priya@example.com', 'student123', 'student');

  addCourse({
    title: 'Full-Stack Web Development with JavaScript',
    description:
      'Build production-ready web applications end to end. From HTML, CSS and JavaScript fundamentals to Node.js, REST APIs and React, this course takes you from zero to full-stack developer with hands-on projects.',
    category: 'Web Development',
    level: 'Beginner',
    instructor: 'Aarav Sharma',
    thumb: 'webdev.jpg',
    video: 'sample-webdev.mp4',
    modules: [
      {
        title: 'Getting Started',
        lessons: [
          { title: 'Welcome to the Course', duration: 120, description: 'Course overview and what you will build.', notes: '# Welcome\n\nIn this course you will build real projects using JavaScript.\n\n## What you need\n- A code editor (VS Code)\n- Node.js installed\n- A browser\n' },
          { title: 'Setting Up Your Environment', duration: 380, description: 'Install Node.js, VS Code and Git.', notes: '# Setup\n\n1. Install Node.js\n2. Install VS Code\n3. Verify with `node -v`\n' },
        ],
      },
      {
        title: 'Frontend Fundamentals',
        lessons: [
          { title: 'HTML & Semantic Markup', duration: 640, description: 'Structure pages with semantic HTML.', notes: '# HTML Basics\n\nUse `<header>`, `<nav>`, `<main>` and `<footer>`.\n' },
          { title: 'Styling with CSS', duration: 720, description: 'Layouts, flexbox and grid.', notes: '# CSS\n\n- Flexbox for one dimension\n- Grid for two dimensions\n' },
          { title: 'JavaScript Essentials', duration: 900, description: 'Variables, functions, arrays and the DOM.', notes: '# JavaScript\n\n`const`, `let`, arrow functions and array methods.\n' },
        ],
      },
      {
        title: 'Building a React App',
        lessons: [
          { title: 'React Components & Props', duration: 700, description: 'Think in components.', notes: '# React\n\nComponents return JSX.\n' },
          { title: 'State, Hooks & Effects', duration: 820, description: 'useState and useEffect in action.', notes: '# Hooks\n\n`useState` manages local state.\n' },
          { title: 'Routing & Data Fetching', duration: 760, description: 'React Router and fetch.', notes: '# Routing\n\nUse `react-router-dom`.\n' },
        ],
      },
      {
        title: 'Backend & Deployment',
        lessons: [
          { title: 'Node.js & Express APIs', duration: 880, description: 'Build a REST API with Express.', notes: '# Express\n\n`app.get`, `app.post`, middleware.\n' },
          { title: 'Databases & SQL', duration: 900, description: 'Store data with SQLite and SQL.', notes: '# SQL\n\nSELECT, INSERT, UPDATE, DELETE.\n' },
          { title: 'Deploying Your App', duration: 480, description: 'Ship it to production.', notes: '# Deploy\n\nUse a cloud platform or VPS.\n' },
        ],
      },
    ],
  });

  addCourse({
    title: 'Data Science & Machine Learning with Python',
    description:
      'Master the Python data science stack — NumPy, Pandas and scikit-learn — and learn how to build, evaluate and deploy real machine learning models with confidence.',
    category: 'Data Science',
    level: 'Intermediate',
    instructor: 'Priya Patel',
    thumb: 'datascience.jpg',
    video: 'sample-datascience.mp4',
    modules: [
      {
        title: 'Python Refresher',
        lessons: [
          { title: 'Python for Data Science', duration: 600, description: 'The essentials you will rely on.', notes: '# Python\n\nLists, dicts, comprehensions.\n' },
        ],
      },
      {
        title: 'Working with Data',
        lessons: [
          { title: 'NumPy Arrays', duration: 700, description: 'Fast numerical computing.', notes: '# NumPy\n\n`np.array`, vectorised ops.\n' },
          { title: 'Pandas DataFrames', duration: 820, description: 'Wrangle and clean data.', notes: '# Pandas\n\n`read_csv`, `groupby`, `merge`.\n' },
          { title: 'Data Visualization', duration: 640, description: 'Tell stories with matplotlib.', notes: '# Plotting\n\nLine, bar and scatter plots.\n' },
        ],
      },
      {
        title: 'Machine Learning',
        lessons: [
          { title: 'Regression Models', duration: 900, description: 'Predict continuous values.', notes: '# Regression\n\nLinear and logistic regression.\n' },
          { title: 'Classification & Evaluation', duration: 880, description: 'Accuracy, precision and recall.', notes: '# Classification\n\nConfusion matrix, ROC.\n' },
          { title: 'Model Deployment', duration: 520, description: 'Serve models as APIs.', notes: '# Deployment\n\nPickle models, FastAPI.\n' },
        ],
      },
    ],
  });

  addCourse({
    title: 'UI/UX Design Fundamentals',
    description:
      'Learn the principles of great product design — user research, wireframing, visual design systems and prototyping — and build a portfolio-ready case study.',
    category: 'Design',
    level: 'Beginner',
    instructor: 'Rohan Mehta',
    thumb: 'design.jpg',
    video: 'sample-design.mp4',
    modules: [
      {
        title: 'Design Foundations',
        lessons: [
          { title: 'What is UX?', duration: 300, description: 'The mindset of a designer.', notes: '# UX\n\nUser experience > features.\n' },
          { title: 'Color, Type & Spacing', duration: 540, description: 'The visual grammar.', notes: '# Visual design\n\nHierarchy, contrast, rhythm.\n' },
        ],
      },
      {
        title: 'From Idea to Interface',
        lessons: [
          { title: 'Wireframing & Prototyping', duration: 620, description: 'Sketch flows and test ideas.', notes: '# Prototyping\n\nLow-fi to hi-fi.\n' },
          { title: 'Building a Design System', duration: 700, description: 'Reusable components and tokens.', notes: '# Design systems\n\nTokens, components, docs.\n' },
        ],
      },
    ],
  });

  // Enroll the demo student in a couple of courses with realistic progress.
  const demoCourseIds = db
    .prepare("SELECT id FROM courses WHERE title IN (?, ?)")
    .all('Full-Stack Web Development with JavaScript', 'Data Science & Machine Learning with Python')
    .map((r) => r.id);

  demoCourseIds.forEach((courseId, ci) => {
    const enrolled = db
      .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
      .get(studentId, courseId);
    if (!enrolled) {
      db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(studentId, courseId);
    }
    const lessons = db
      .prepare(
        `SELECT l.id, l.duration_sec FROM lessons l
         JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY m.position, l.position`
      )
      .all(courseId);
    // Mark roughly half (course 1) / a third (course 2) of lessons complete.
    const fraction = ci === 0 ? 0.5 : 1 / 3;
    const doneCount = Math.max(1, Math.round(lessons.length * fraction));
    lessons.slice(0, doneCount).forEach((l) => {
      const existing = db
        .prepare('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
        .get(studentId, l.id);
      if (existing) return;
      db.prepare(
        'INSERT INTO lesson_progress (user_id, lesson_id, completed, watched_sec) VALUES (?, ?, 1, ?)'
      ).run(studentId, l.id, l.duration_sec || 60);
    });
  });

  console.log('Seed complete.');
  console.log('  Admin  → admin@learnhub.com / admin123');
  console.log('  Student→ student@learnhub.com / student123');
  console.log('  Student→ priya@example.com / student123');
  void adminId; void studentId;
}

// Seed only when the database has no users/courses yet. This keeps the app
// self-healing: if the (gitignored) SQLite file is missing after a fresh
// checkout/restart, the server recreates the demo data automatically.
export function seedIfEmpty() {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const courses = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
  if (users === 0 || courses === 0) {
    run();
    return true;
  }
  return false;
}

// Allow direct execution: `node src/seed.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
