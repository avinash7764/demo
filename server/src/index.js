import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import { UPLOAD_DIR, mimeFor } from './stream.js';
import { seedIfEmpty } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

// Ensure demo data exists (idempotent — only seeds an empty database).
seedIfEmpty();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file access for thumbnails (public) — served from /uploads/...
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => res.setHeader('Content-Type', mimeFor(filePath)),
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'learnhub-api' }));

// ---- serve the built React app (if present) ----
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — everything non-API goes to index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LearnHub API running on http://0.0.0.0:${PORT}`);
});
