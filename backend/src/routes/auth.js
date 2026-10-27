import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { sendCode } from '../mailer.js';

const router = Router();

// Only allow sign-ups from your institution, e.g. ALLOWED_EMAIL_DOMAIN=geu.ac.in
// Several domains: ALLOWED_EMAIL_DOMAIN=geu.ac.in,gehu.ac.in   (empty = anyone can sign up)
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAIN || '')
  .split(',')
  .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

// Exact match on the part after "@", so "x@geu.ac.in.evil.com" or "x@notgeu.ac.in" don't pass
const isAllowedEmail = (email) =>
  ALLOWED_DOMAINS.length === 0 || ALLOWED_DOMAINS.includes(email.slice(email.lastIndexOf('@') + 1));
const DOMAIN_ERROR = () => `Only college emails can sign up. Use your ${ALLOWED_DOMAINS.map((d) => '@' + d).join(' or ')} address.`;

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Slows down password guessing and stops anyone using the server to spam inboxes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });
const findUser = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(normEmail(email));
const normEmail = (email) => String(email || '').trim().toLowerCase();
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

function validPassword(password) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}
const PASSWORD_RULE = 'Password must be at least 8 characters and include a letter and a number';

// Creates a fresh 6-digit code and emails it. Returns { cooldown: seconds } if one was sent too recently.
async function issueCode(user, purpose) {
  const last = db
    .prepare('SELECT created_at FROM email_codes WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, purpose);
  const since = last ? Date.now() - last.created_at : Infinity;
  if (since < RESEND_COOLDOWN_MS) return { cooldown: Math.ceil((RESEND_COOLDOWN_MS - since) / 1000) };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  db.prepare('DELETE FROM email_codes WHERE user_id = ? AND purpose = ?').run(user.id, purpose);
  db.prepare('INSERT INTO email_codes (user_id, purpose, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, purpose, hashCode(code), Date.now() + CODE_TTL_MS, Date.now());
  await sendCode(user.email, user.name, code, purpose); // throws if the email can't be sent
  return { sent: true };
}

// Returns an error message, or null if the code is correct (the code is then used up)
function checkCode(user, purpose, code) {
  const row = db
    .prepare('SELECT * FROM email_codes WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, purpose);
  if (!row || row.expires_at < Date.now()) return 'This code has expired. Tap "Resend code" to get a new one.';
  if (row.attempts >= MAX_ATTEMPTS) return 'Too many wrong attempts. Tap "Resend code" to get a new one.';

  const ok = crypto.timingSafeEqual(Buffer.from(hashCode(String(code).trim())), Buffer.from(row.code_hash));
  if (!ok) {
    db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return left > 0 ? `Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong attempts. Tap "Resend code" to get a new one.';
  }
  db.prepare('DELETE FROM email_codes WHERE user_id = ? AND purpose = ?').run(user.id, purpose);
  return null;
}

const MAIL_FAILED = "We couldn't send the email right now. Tap \"Resend code\" in a minute.";

// Lets the app show "Use your @geu.ac.in email" before the user types anything
router.get('/config', (_req, res) => res.json({ allowedDomains: ALLOWED_DOMAINS }));

router.post('/register', authLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normEmail(req.body.email);
  const phone = String(req.body.phone || '').trim() || null;
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!isAllowedEmail(email)) return res.status(400).json({ error: DOMAIN_ERROR() });
  if (!validPassword(password)) return res.status(400).json({ error: PASSWORD_RULE });
  if (findUser(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Log in, or use "Forgot password".' });
  }

  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, phone, password_hash, email_verified) VALUES (?, ?, ?, ?, 0)')
    .run(name, email, phone, bcrypt.hashSync(password, 10));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);

  try {
    await issueCode(user, 'verify');
    res.status(201).json({ needsVerification: true, email });
  } catch (e) {
    console.error('[mail] send failed:', e.message);
    res.status(201).json({ needsVerification: true, email, warning: MAIL_FAILED });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const user = findUser(req.body.email);
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  if (!user.email_verified) {
    // Send a fresh code (unless one went out in the last minute) and send them to the verify screen
    let warning;
    try { await issueCode(user, 'verify'); } catch { warning = MAIL_FAILED; }
    return res.status(403).json({
      error: `Please verify your email first. We sent a code to ${user.email}.`,
      needsVerification: true, email: user.email, warning,
    });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/verify', authLimiter, (req, res) => {
  const user = findUser(req.body.email);
  if (!user) return res.status(400).json({ error: 'Incorrect code' });
  if (user.email_verified) return res.status(400).json({ error: 'This email is already verified. Please log in.' });

  const error = checkCode(user, 'verify', req.body.code);
  if (error) return res.status(400).json({ error });

  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/resend', authLimiter, async (req, res) => {
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'verify';
  const user = findUser(req.body.email);
  // Same reply whether or not the account exists, so this can't be used to discover emails
  const ok = { ok: true, message: 'If that account needs a code, a new one is on its way.' };
  if (!user || (purpose === 'verify' && user.email_verified)) return res.json(ok);

  try {
    const result = await issueCode(user, purpose);
    if (result.cooldown) {
      return res.status(429).json({ error: `Please wait ${result.cooldown}s before asking for another code.`, retryAfter: result.cooldown });
    }
    res.json(ok);
  } catch (e) {
    console.error('[mail] send failed:', e.message);
    res.status(502).json({ error: MAIL_FAILED });
  }
});

router.post('/forgot', authLimiter, async (req, res) => {
  const user = findUser(req.body.email);
  if (user) {
    try { await issueCode(user, 'reset'); } catch (e) { console.error('[mail] send failed:', e.message); }
  }
  res.json({ ok: true, message: 'If an account exists for that email, we sent a reset code.' });
});

router.post('/reset', authLimiter, (req, res) => {
  const password = String(req.body.password || '');
  if (!validPassword(password)) return res.status(400).json({ error: PASSWORD_RULE });
  const user = findUser(req.body.email);
  if (!user) return res.status(400).json({ error: 'Incorrect code' });

  const error = checkCode(user, 'reset', req.body.code);
  if (error) return res.status(400).json({ error });

  // Receiving the code also proves they own the email
  db.prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

export default router;
