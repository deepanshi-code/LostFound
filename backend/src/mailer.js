import nodemailer from 'nodemailer';

// How codes are delivered, in order of preference:
// 1. BREVO_API_KEY: Brevo's HTTPS API. Use this on hosts that block SMTP ports (e.g. Render's free plan).
// 2. SMTP_HOST/SMTP_USER/SMTP_PASS: any SMTP server, e.g. Gmail with an App Password (fine locally).
// 3. Neither: codes are printed to this terminal, so development works offline.
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, BREVO_API_KEY } = process.env;
const port = Number(SMTP_PORT) || 587;

// MAIL_FROM may be "Name <address>" or just an address. With Brevo it must be a verified sender.
const fromRaw = process.env.MAIL_FROM || (SMTP_USER ? `Campus Lost & Found <${SMTP_USER}>` : '');
const fromMatch = fromRaw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
const sender = fromMatch
  ? { name: fromMatch[1] || 'Campus Lost & Found', email: fromMatch[2] }
  : { name: 'Campus Lost & Found', email: fromRaw.trim() };

const mode = BREVO_API_KEY ? 'brevo' : SMTP_HOST && SMTP_USER && SMTP_PASS ? 'smtp' : 'console';

const transporter = mode === 'smtp'
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // true only for port 465; 587 upgrades to TLS automatically
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

// Checks the configured delivery method and explains the most common failures in plain words
export async function smtpStatus() {
  if (mode === 'console') {
    return { ok: false, message: 'Email is not configured (set BREVO_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS). Codes are printed instead.' };
  }
  if (mode === 'brevo') {
    if (!sender.email) return { ok: false, message: 'MAIL_FROM is empty. Set it to a sender address you verified in Brevo.' };
    try {
      const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' } });
      if (res.status === 401) return { ok: false, message: 'Brevo rejected the API key. Create a new one under SMTP & API → API Keys.' };
      if (!res.ok) return { ok: false, message: `Brevo account check failed (${res.status}).` };
      return { ok: true, message: `Brevo ready (sending as ${sender.email})` };
    } catch (e) {
      return { ok: false, message: `Could not reach Brevo: ${e.message}` };
    }
  }
  try {
    await transporter.verify();
    return { ok: true, message: `SMTP ready (${SMTP_HOST} as ${SMTP_USER})` };
  } catch (e) {
    const hint =
      e.code === 'EAUTH' || /535|Username and Password/i.test(e.message)
        ? 'Login rejected. For Gmail, SMTP_PASS must be a 16-character App Password, not your normal password.'
        : e.code === 'ETIMEDOUT' || e.code === 'ECONNECTION' || e.code === 'ESOCKET'
          ? `Could not reach ${SMTP_HOST}:${port}. The network or host may block email ports (Render's free plan does; use BREVO_API_KEY there).`
          : e.message;
    return { ok: false, message: `SMTP login failed: ${hint}` };
  }
}

// Result of the startup check, shown (without any secrets) by /api/health
export const mailInfo = { mode, ready: false, problem: mode === 'console' ? 'not configured' : 'checking' };

if (process.argv[1]?.endsWith('server.js')) {
  if (mode === 'console') console.warn('[mail] Email not configured. Verification codes will be printed here instead of emailed.');
  else smtpStatus().then((s) => {
    mailInfo.ready = s.ok;
    mailInfo.problem = s.ok ? null : s.message;
    s.ok ? console.log(`[mail] ${s.message}`) : console.error(`[mail] ${s.message}`);
  });
}

const PURPOSE = {
  verify: { heading: 'Confirm your email', line: 'Use this code to finish creating your account:' },
  reset: { heading: 'Reset your password', line: 'Use this code to choose a new password:' },
};

export async function sendCode(to, name, code, purpose) {
  const p = PURPOSE[purpose];
  const subject = `${code} is your Campus Lost & Found code`;
  const text = `Hi ${name},\n\n${p.line}\n\n${code}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email.\n\nCampus Lost & Found`;
  const html = `
    <div style="background:#F3F6FD;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:440px;margin:auto;background:#ffffff;border-radius:20px;padding:28px;color:#0E1530">
        <div style="font-size:15px;font-weight:bold;color:#2F5BFF">Campus Lost &amp; Found</div>
        <h2 style="margin:16px 0 8px;font-size:22px">${p.heading}</h2>
        <p style="margin:0 0 18px;color:#59627D;font-size:15px">Hi ${escapeHtml(name)}, ${p.line.toLowerCase()}</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:10px;background:#EAEFFF;color:#2F5BFF;
                    padding:16px;border-radius:14px;text-align:center">${code}</div>
        <p style="margin:18px 0 0;color:#98A0B8;font-size:13px">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p>
      </div>
    </div>`;

  if (mode === 'console') {
    console.log(`\n[mail:dev] To: ${to} | ${p.heading} | CODE: ${code}\n`);
    return;
  }
  await deliver(to, name, subject, text, html);
}

// The web app, for links in emails. Item pages open at APP_URL/item/<id>.
export const APP_URL = (process.env.APP_URL || 'https://lostfound-mobile.vercel.app').replace(/\/$/, '');

// A short notice with one button, e.g. "Someone responded to your post". Never include contact details.
export async function sendNotice(to, name, { subject, heading, lines, button, link }) {
  const url = APP_URL + link;
  const footer = 'You can turn these emails off in the app under Profile.';
  const text = `Hi ${name},\n\n${lines.join('\n\n')}\n\n${button}: ${url}\n\n${footer}\n\nCampus Lost & Found`;
  const html = `
    <div style="background:#F3F6FD;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:440px;margin:auto;background:#ffffff;border-radius:20px;padding:28px;color:#0E1530">
        <div style="font-size:15px;font-weight:bold;color:#2F5BFF">Campus Lost &amp; Found</div>
        <h2 style="margin:16px 0 8px;font-size:22px">${escapeHtml(heading)}</h2>
        <p style="margin:0 0 12px;color:#59627D;font-size:15px">Hi ${escapeHtml(name)},</p>
        ${lines.map((l) => `<p style="margin:0 0 12px;color:#59627D;font-size:15px;line-height:22px">${escapeHtml(l)}</p>`).join('')}
        <a href="${url}" style="display:inline-block;margin-top:8px;background:#2F5BFF;color:#ffffff;text-decoration:none;
                  font-weight:bold;font-size:15px;padding:12px 22px;border-radius:12px">${escapeHtml(button)}</a>
        <p style="margin:22px 0 0;color:#98A0B8;font-size:13px">${footer}</p>
      </div>
    </div>`;

  if (mode === 'console') {
    console.log(`\n[mail:dev] To: ${to} | ${subject} | ${url}\n`);
    return;
  }
  await deliver(to, name, subject, text, html);
}

async function deliver(to, name, subject, text, html) {
  if (mode === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender, to: [{ email: to, name }], subject, textContent: text, htmlContent: html }),
    });
    if (!res.ok) throw new Error(`Brevo send failed (${res.status}): ${await res.text()}`);
    return;
  }

  await transporter.sendMail({ from: `${sender.name} <${sender.email}>`, to, subject, text, html });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
