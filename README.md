# 🎓 LearnHub — Full-Stack E-Learning Platform

A LinkedIn Learning–style platform where **admins upload courses, video lessons and lecture notes**, and **students sign in with their email** to enroll, watch videos, download notes, and track their progress. Includes a complete **admin panel**.

Built with **Node.js + Express + SQLite** (backend) and **React + Vite** (frontend).

---

## ✨ Features

### For students
- Sign up / log in with **email + password** (JWT-based sessions)
- Browse the course catalog (search-free, clean grid)
- **Enroll** in courses and see them in **My Learning**
- **Stream videos** with seeking/buffering (HTTP Range support)
- **Download lecture notes** (PDF, DOC, PPT, TXT, MD, ZIP…)
- **Progress tracking** — per-lesson completion + overall course % bar
- Auto-marks a lesson complete when watched to ~90%

### For admins (admin panel)
- **Dashboard** with live stats (students, courses, lessons, enrollments, completions)
- Full **course CRUD** — create/edit/delete courses with thumbnail, category, level, pricing, publish status
- **Module & lesson management** — reorder, rename, delete
- **Upload videos** (MP4/WebM/MOV, up to 2 GB) and **notes** per lesson
- **Student management** — view every student, their enrolled courses and progress; delete accounts

---

## 🧱 Tech stack

| Layer     | Technology |
|-----------|------------|
| Backend   | Node.js, Express, SQLite (built-in `node:sqlite` — zero native deps) |
| Auth      | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Uploads   | `multer` (video/notes/thumbnails) |
| Frontend  | React 18, React Router, Vite |
| Styling   | Hand-rolled CSS design system (no UI framework) |

---

## 🚀 Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Seed the database (creates sample courses + demo users)
```bash
npm run seed
```

> Seed data includes 3 sample courses (with thumbnails & downloadable notes), plus these demo accounts:

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | `admin@learnhub.com`     | `admin123`  |
| Student | `student@learnhub.com`   | `student123`|
| Student | `priya@example.com`      | `student123`|

### 3. Run in development
```bash
npm run dev
```
- Frontend (Vite dev server with API proxy): **http://localhost:5173**
- Backend API: **http://localhost:4000**

### 4. Run in production (single server)
```bash
npm run build     # build the React app
npm start         # Express serves both the API and the built frontend
```
Then open **http://localhost:4000**.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust:

```env
PORT=4000
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_EMAIL=admin@learnhub.com
ADMIN_PASSWORD=admin123
```

---

## 📁 Project structure

```
demo/
├── server/                # Express API
│   ├── src/
│   │   ├── index.js       # app entry + static serving
│   │   ├── db.js          # SQLite schema & helpers
│   │   ├── auth.js        # JWT + role middleware
│   │   ├── stream.js      # video Range streaming + MIME map
│   │   ├── seed.js        # demo data seeder
│   │   └── routes/
│   │       ├── auth.js    # register / login / me
│   │       ├── courses.js # public catalog + course detail
│   │       ├── student.js # enroll, progress, stream, notes
│   │       └── admin.js   # admin CRUD + uploads + students
│   ├── data/              # SQLite database (gitignored)
│   └── uploads/           # videos / notes / thumbnails (gitignored)
└── client/                # React SPA
    └── src/
        ├── pages/         # Home, CourseDetail, Player, Dashboard, Login…
        ├── pages/admin/   # Admin dashboard, courses, editor, students
        ├── components/    # Layouts, CourseCard, Toast
        └── lib/           # api client + auth context
```

---

## 🔐 How it works (key endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | – | Create a student account |
| POST | `/api/auth/login` | – | Log in (any role) |
| GET | `/api/courses` | – | Course catalog |
| GET | `/api/courses/:id` | optional | Course detail + modules + lessons |
| POST | `/api/student/courses/:id/enroll` | student | Enroll |
| GET | `/api/student/my-courses` | student | Enrolled courses + progress |
| POST | `/api/student/lessons/:id/progress` | student | Report watch/completion |
| GET | `/api/student/lessons/:id/stream` | student | Stream video (Range) |
| GET | `/api/student/lessons/:id/notes` | student | Download notes |
| * | `/api/admin/**` | admin | Stats, course/module/lesson CRUD, students |

Videos stream with **HTTP Range** support so the browser player can seek and buffer. Notes download via `Content-Disposition: attachment`.

---

## ⚠️ Notes for production

- Set a strong `JWT_SECRET` and change the default admin password before deploying.
- SQLite is great for single-server deployments; swap in Postgres/MySQL via the `db.js` layer if you need horizontal scale.
- Video uploads are stored on the local filesystem; for cloud deployments, point the upload layer at S3/GCS.
