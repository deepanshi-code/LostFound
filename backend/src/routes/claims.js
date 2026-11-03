import { Router } from 'express';
import { one, query } from '../db.js';
import { requireAuth } from '../auth.js';
import { notifyDecision } from '../notify.js';

const router = Router();
router.use(requireAuth);

// Responses I have sent on other people's posts
router.get('/mine', async (req, res) => {
  const claims = await query(`
    SELECT c.id, c.message, c.status, c.created_at,
           i.id AS item_id, i.title AS item_title, i.type AS item_type, i.status AS item_status,
           i.category AS item_category,
           u.name AS poster_name,
           CASE WHEN c.status = 'approved' THEN u.email END AS poster_email,
           CASE WHEN c.status = 'approved' THEN u.phone END AS poster_phone
    FROM claims c
    JOIN items i ON i.id = c.item_id
    JOIN users u ON u.id = i.user_id
    WHERE c.claimant_id = $1
    ORDER BY c.created_at DESC, c.id DESC`, [req.userId]);
  res.json({ claims });
});

// For the badge on the Activity tab: responses on my open posts that I haven't decided yet
router.get('/pending-count', async (req, res) => {
  const row = await one(`
    SELECT COUNT(*)::int AS count FROM claims c JOIN items i ON i.id = c.item_id
    WHERE i.user_id = $1 AND i.status = 'open' AND c.status = 'pending'`, [req.userId]);
  res.json(row);
});

// Poster approves or rejects a response. Approving reveals contact details to both sides.
router.patch('/:id', async (req, res) => {
  const claim = /^\d+$/.test(req.params.id)
    ? await one(`
        SELECT c.*, i.user_id AS item_owner FROM claims c JOIN items i ON i.id = c.item_id
        WHERE c.id = $1`, [Number(req.params.id)])
    : undefined;
  if (!claim) return res.status(404).json({ error: 'Response not found' });
  if (claim.item_owner !== req.userId) return res.status(403).json({ error: 'Only the poster can do this' });

  const { status } = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
  }
  await query('UPDATE claims SET status = $1 WHERE id = $2', [status, claim.id]);
  res.json({ ok: true, status });

  if (claim.status !== status) {
    notifyDecision(claim, status).catch((e) => console.error('[notify] decision failed:', e.message));
  }
});

export default router;
