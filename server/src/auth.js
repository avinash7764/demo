import jwt from 'jsonwebtoken';
import { db, rowToUser } from './db.js';

export const JWT_SECRET =
  process.env.JWT_SECRET || 'learnhub-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function resolveUser(req) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  // Allow ?token= for <video> src URLs which cannot carry headers.
  if (!token && req.query && req.query.token) token = req.query.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    return user ? rowToUser(user) : null;
  } catch {
    return null;
  }
}

export function authRequired(req, res, next) {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = user;
  next();
}

// Attaches req.user if a valid token is present, but never rejects.
export function optionalAuth(req, res, next) {
  req.user = resolveUser(req) || null;
  next();
}

export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}
