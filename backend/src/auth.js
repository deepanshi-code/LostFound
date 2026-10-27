import jwt from 'jsonwebtoken';

const DEV_SECRET = 'dev-only-secret-change-me';
export const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

if (JWT_SECRET === DEV_SECRET) {
  console.warn('[auth] JWT_SECRET not set — using an insecure development secret.');
}

export function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in first' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
