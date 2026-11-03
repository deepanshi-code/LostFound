import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { CATEGORIES, one, query } from '../db.js';
import { requireAuth } from '../auth.js';
import { findMatches } from '../matching.js';
import { notifyMatches, notifyNewResponse } from '../notify.js';
import { deleteImage, publicImagePath, saveImage } from '../storage.js';

// Photos are kept in memory, validated, then handed to storage (Supabase or local disk)
const upload = multer({
  storage: multer.memoryStorage(),
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
         (SELECT COUNT(*)::int FROM claims c WHERE c.item_id = i.id AND c.status = 'pending') AS pending_claims
  FROM items i JOIN users u ON u.id = i.user_id`;

const withImageUrl = (item) => ({ ...item, image_url: publicImagePath(item.image_path) });

// Non-numeric ids would make Postgres throw, so treat them as "not found"
const getItem = (id) => (/^\d+$/.test(String(id)) ? one(`${ITEM_SELECT} WHERE i.id = $1`, [Number(id)]) : undefined);

// Open posts of the opposite type, same category, by other people
const candidatesFor = (item) => query(
  `${ITEM_SELECT} WHERE i.type = $1 AND i.category = $2 AND i.status = 'open' AND i.user_id != $3`,
  [item.type === 'lost' ? 'found' : 'lost', item.category, item.user_id]);

router.get('/categories', (_req, res) => res.json({ categories: CATEGORIES }));

// Numbers for the home screen
router.get('/stats', async (_req, res) => {
  const row = await one(`
    SELECT COALESCE(SUM((type = 'lost' AND status = 'open')::int), 0)::int  AS lost_open,
           COALESCE(SUM((type = 'found' AND status = 'open')::int), 0)::int AS found_open,
           COALESCE(SUM((status = 'resolved')::int), 0)::int                AS reunited
    FROM items`);
  res.json(row);
});

// Feed: GET /api/items?type=lost|found&category=Keys&q=blue&status=open
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  const { type, category, q } = req.query;
  const status = req.query.status || 'open';

  if (type === 'lost' || type === 'found') where.push(`i.type = ${add(type)}`);
  if (category && CATEGORIES.includes(category)) where.push(`i.category = ${add(category)}`);
  if (status !== 'all') where.push(`i.status = ${add(status)}`);
  if (q) {
    const like = add(`%${String(q).trim()}%`);
    where.push(`(i.title ILIKE ${like} OR i.description ILIKE ${like} OR i.location ILIKE ${like})`);
  }

  const items = await query(`${ITEM_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY i.created_at DESC, i.id DESC LIMIT 100`, params);
  res.json({ items: items.map(withImageUrl) });
});

router.get('/mine', async (req, res) => {
  const items = await query(`${ITEM_SELECT} WHERE i.user_id = $1 ORDER BY i.created_at DESC, i.id DESC`, [req.userId]);
  res.json({ items: items.map(withImageUrl) });
});

router.get('/:id', async (req, res) => {
  const item = await getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const isOwner = item.user_id === req.userId;
  const response = { item: { ...withImageUrl(item), is_mine: isOwner } };

  if (isOwner) {
    // Owner sees every response; contact details only for the ones they approved.
    response.claims = await query(`
      SELECT c.id, c.message, c.status, c.created_at, u.name AS claimant_name,
             CASE WHEN c.status = 'approved' THEN u.email END AS claimant_email,
             CASE WHEN c.status = 'approved' THEN u.phone END AS claimant_phone
      FROM claims c JOIN users u ON u.id = c.claimant_id
      WHERE c.item_id = $1 ORDER BY c.created_at DESC`, [item.id]);
  } else {
    const mine = await one('SELECT id, message, status, created_at FROM claims WHERE item_id = $1 AND claimant_id = $2', [item.id, req.userId]);
    response.my_claim = mine || null;
    if (mine?.status === 'approved') {
      response.poster_contact = await one('SELECT email, phone FROM users WHERE id = $1', [item.user_id]);
    }
  }
  res.json(response);
});

router.get('/:id/matches', async (req, res) => {
  const item = await getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ matches: findMatches(item, await candidatesFor(item)).map(withImageUrl) });
});

router.post('/', upload.single('image'), async (req, res) => {
  const b = req.body;
  const type = b.type;
  const title = String(b.title || '').trim();
  const description = String(b.description || '').trim();
  const category = b.category;
  const location = String(b.location || '').trim();
  const date = String(b.date_occurred || '').trim() || new Date().toISOString().slice(0, 10);

  const fail = (msg) => res.status(400).json({ error: msg });
  if (type !== 'lost' && type !== 'found') return fail('Type must be "lost" or "found"');
  if (!title) return fail('Title is required');
  if (title.length > 80) return fail('Title must be 80 characters or fewer');
  if (!CATEGORIES.includes(category)) return fail('Choose a valid category');
  if (!location) return fail('Location is required');
  if (Number.isNaN(Date.parse(date))) return fail('Date must look like YYYY-MM-DD');

  let imagePath = null;
  if (req.file) {
    const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase().slice(0, 5);
    imagePath = await saveImage(req.file.buffer, crypto.randomBytes(12).toString('hex') + ext);
  }

  const { id } = await one(`
    INSERT INTO items (user_id, type, title, description, category, location, date_occurred, image_path)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [req.userId, type, title, description, category, location, date, imagePath]);

  const item = await getItem(id);
  res.status(201).json({ item: withImageUrl(item) });

  // After replying: email owners of posts this one looks like a match for
  candidatesFor(item)
    .then((candidates) => notifyMatches(item, findMatches(item, candidates)))
    .catch((e) => console.error('[notify] matches failed:', e.message));
});

router.patch('/:id/status', async (req, res) => {
  const item = await getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id !== req.userId) return res.status(403).json({ error: 'Only the poster can change this' });
  const { status } = req.body;
  if (status !== 'open' && status !== 'resolved') return res.status(400).json({ error: 'Invalid status' });
  await query('UPDATE items SET status = $1 WHERE id = $2', [status, item.id]);
  res.json({ item: withImageUrl(await getItem(item.id)) });
});

router.delete('/:id', async (req, res) => {
  const item = await getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id !== req.userId) return res.status(403).json({ error: 'Only the poster can delete this' });
  await query('DELETE FROM items WHERE id = $1', [item.id]);
  await deleteImage(item.image_path);
  res.json({ ok: true });
});

// Respond to someone else's post ("This is mine" / "I found this")
router.post('/:id/claims', async (req, res) => {
  const item = await getItem(req.params.id);
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
  if (await one('SELECT 1 FROM claims WHERE item_id = $1 AND claimant_id = $2', [item.id, req.userId])) {
    return res.status(409).json({ error: 'You have already responded to this post' });
  }
  const claim = await one('INSERT INTO claims (item_id, claimant_id, message) VALUES ($1, $2, $3) RETURNING *', [item.id, req.userId, message]);
  res.status(201).json({ claim });

  one('SELECT name FROM users WHERE id = $1', [req.userId])
    .then((responder) => notifyNewResponse(item, responder.name))
    .catch((e) => console.error('[notify] response failed:', e.message));
});

export default router;
