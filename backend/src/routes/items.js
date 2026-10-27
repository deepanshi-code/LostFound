import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { mkdirSync, unlink } from 'node:fs';
import { db, CATEGORIES } from '../db.js';
import { requireAuth } from '../auth.js';
import { findMatches } from '../matching.js';

export const UPLOAD_DIR = path.resolve(import.meta.dirname, '..', '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 5);
      cb(null, crypto.randomBytes(12).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(requireAuth);

const ITEM_SELECT = `
  SELECT i.*, u.name AS poster_name,
         (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id AND c.status = 'pending') AS pending_claims
  FROM items i JOIN users u ON u.id = i.user_id`;

const withImageUrl = (item) => ({
  ...item,
  image_url: item.image_path ? `/uploads/${item.image_path}` : null,
});

const getItem = (id) => db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id);

router.get('/categories', (_req, res) => res.json({ categories: CATEGORIES }));

// Numbers for the home screen
router.get('/stats', (_req, res) => {
  const row = db.prepare(`
    SELECT SUM(type = 'lost' AND status = 'open')  AS lost_open,
           SUM(type = 'found' AND status = 'open') AS found_open,
           SUM(status = 'resolved')                AS reunited
    FROM items`).get();
  res.json({ lost_open: row.lost_open || 0, found_open: row.found_open || 0, reunited: row.reunited || 0 });
});

// Feed: GET /api/items?type=lost|found&category=Keys&q=blue&status=open
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  const { type, category, q } = req.query;
  const status = req.query.status || 'open';

  if (type === 'lost' || type === 'found') { where.push('i.type = ?'); params.push(type); }
  if (category && CATEGORIES.includes(category)) { where.push('i.category = ?'); params.push(category); }
  if (status !== 'all') { where.push('i.status = ?'); params.push(status); }
  if (q) {
    where.push('(i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)');
    const like = `%${String(q).trim()}%`;
    params.push(like, like, like);
  }

  const sql = `${ITEM_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY i.created_at DESC, i.id DESC LIMIT 100`;
  res.json({ items: db.prepare(sql).all(...params).map(withImageUrl) });
});

router.get('/mine', (req, res) => {
  const items = db
    .prepare(`${ITEM_SELECT} WHERE i.user_id = ? ORDER BY i.created_at DESC, i.id DESC`)
    .all(req.userId);
  res.json({ items: items.map(withImageUrl) });
});

router.get('/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const isOwner = item.user_id === req.userId;
  const response = { item: { ...withImageUrl(item), is_mine: isOwner } };

  if (isOwner) {
    // Owner sees every response; contact details only for the ones they approved.
    response.claims = db.prepare(`
      SELECT c.id, c.message, c.status, c.created_at, u.name AS claimant_name,
             CASE WHEN c.status = 'approved' THEN u.email END AS claimant_email,
             CASE WHEN c.status = 'approved' THEN u.phone END AS claimant_phone
      FROM claims c JOIN users u ON u.id = c.claimant_id
      WHERE c.item_id = ? ORDER BY c.created_at DESC`).all(item.id);
  } else {
    const mine = db
      .prepare('SELECT id, message, status, created_at FROM claims WHERE item_id = ? AND claimant_id = ?')
      .get(item.id, req.userId);
    response.my_claim = mine || null;
    if (mine?.status === 'approved') {
      const poster = db.prepare('SELECT email, phone FROM users WHERE id = ?').get(item.user_id);
      response.poster_contact = poster;
    }
  }
  res.json(response);
});

router.get('/:id/matches', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const opposite = item.type === 'lost' ? 'found' : 'lost';
  const candidates = db
    .prepare(`${ITEM_SELECT} WHERE i.type = ? AND i.category = ? AND i.status = 'open' AND i.user_id != ?`)
    .all(opposite, item.category, item.user_id);
  res.json({ matches: findMatches(item, candidates).map(withImageUrl) });
});

router.post('/', upload.single('image'), (req, res) => {
  const b = req.body;
  const type = b.type;
  const title = String(b.title || '').trim();
  const description = String(b.description || '').trim();
  const category = b.category;
  const location = String(b.location || '').trim();
  const date = String(b.date_occurred || '').trim() || new Date().toISOString().slice(0, 10);

  const fail = (msg) => {
    if (req.file) unlink(req.file.path, () => {});
    res.status(400).json({ error: msg });
  };
  if (type !== 'lost' && type !== 'found') return fail('Type must be "lost" or "found"');
  if (!title) return fail('Title is required');
  if (title.length > 80) return fail('Title must be 80 characters or fewer');
  if (!CATEGORIES.includes(category)) return fail('Choose a valid category');
  if (!location) return fail('Location is required');
  if (Number.isNaN(Date.parse(date))) return fail('Date must look like YYYY-MM-DD');

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO items (user_id, type, title, description, category, location, date_occurred, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.userId, type, title, description, category, location, date, req.file?.filename ?? null);

  res.status(201).json({ item: withImageUrl(getItem(lastInsertRowid)) });
});

router.patch('/:id/status', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id !== req.userId) return res.status(403).json({ error: 'Only the poster can change this' });
  const { status } = req.body;
  if (status !== 'open' && status !== 'resolved') return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE items SET status = ? WHERE id = ?').run(status, item.id);
  res.json({ item: withImageUrl(getItem(item.id)) });
});

router.delete('/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id !== req.userId) return res.status(403).json({ error: 'Only the poster can delete this' });
  db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
  if (item.image_path) unlink(path.join(UPLOAD_DIR, item.image_path), () => {});
  res.json({ ok: true });
});

// Respond to someone else's post ("This is mine" / "I found this")
router.post('/:id/claims', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id === req.userId) return res.status(400).json({ error: 'You cannot respond to your own post' });
  if (item.status !== 'open') return res.status(400).json({ error: 'This item is already resolved' });

  const message = String(req.body.message || '').trim();
  if (message.length < 10) {
    return res.status(400).json({
      error: item.type === 'found'
        ? 'Describe the item in at least 10 characters so the finder can verify it is yours'
        : 'Tell the owner where you found it (at least 10 characters)',
    });
  }
  if (db.prepare('SELECT 1 FROM claims WHERE item_id = ? AND claimant_id = ?').get(item.id, req.userId)) {
    return res.status(409).json({ error: 'You have already responded to this post' });
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO claims (item_id, claimant_id, message) VALUES (?, ?, ?)')
    .run(item.id, req.userId, message);
  res.status(201).json({ claim: db.prepare('SELECT * FROM claims WHERE id = ?').get(lastInsertRowid) });
});

export default router;
