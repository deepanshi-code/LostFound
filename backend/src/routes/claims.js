import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Responses I have sent on other people's posts
router.get('/mine', (req, res) => {
  const claims = db.prepare(`
    SELECT c.id, c.message, c.status, c.created_at,
           i.id AS item_id, i.title AS item_title, i.type AS item_type, i.status AS item_status,
           i.category AS item_category,
           u.name AS poster_name,
           CASE WHEN c.status = 'approved' THEN u.email END AS poster_email,
           CASE WHEN c.status = 'approved' THEN u.phone END AS poster_phone
    FROM claims c
    JOIN items i ON i.id = c.item_id
    JOIN users u ON u.id = i.user_id
    WHERE c.claimant_id = ?
    ORDER BY c.created_at DESC, c.id DESC`).all(req.userId);
  res.json({ claims });
});

// Poster approves or rejects a response. Approving reveals contact details to both sides.
router.patch('/:id', (req, res) => {
  const claim = db.prepare(`
    SELECT c.*, i.user_id AS item_owner FROM claims c JOIN items i ON i.id = c.item_id
    WHERE c.id = ?`).get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Response not found' });
  if (claim.item_owner !== req.userId) return res.status(403).json({ error: 'Only the poster can do this' });

  const { status } = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
  }
  db.prepare('UPDATE claims SET status = ? WHERE id = ?').run(status, claim.id);
  res.json({ ok: true, status });
});

export default router;
