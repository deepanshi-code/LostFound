import nodemailer from 'nodemailer';

// Sends real email when SMTP_* is configured in .env (Gmail, Brevo, Outlook, your college's SMTP...).
// Without it, emails are printed to this terminal instead, so development works offline.
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
const MAIL_FROM = process.env.MAIL_FROM || (SMTP_USER ? `Campus Lost & Found <${SMTP_USER}>` : 'Campus Lost & Found');
const port = Number(SMTP_PORT) || 587;

const transporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // true only for port 465; 587 upgrades to TLS automatically
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

if (transporter) {
  transporter.verify()
    .then(() => console.log(`[mail] SMTP ready (${SMTP_HOST} as ${SMTP_USER})`))
    .catch((e) => console.error(`[mail] SMTP login failed: ${e.message}. Check SMTP_* in .env`));
} else {
  console.warn('[mail] SMTP not configured. Verification codes will be printed here instead of emailed.');
}

const PURPOSE = {
  verify: { subject: 'Verify your email', heading: 'Confirm your email', line: 'Use this code to finish creating your account:' },
  reset: { subject: 'Reset your password', heading: 'Reset your password', line: 'Use this code to choose a new password:' },
};

export async function sendCode(to, name, code, purpose) {
  const p = PURPOSE[purpose];
  const text = `Hi ${name},\n\n${p.line}\n\n${code}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email.\n\nCampus Lost & Found`;

  if (!transporter) {
    console.log(`\n[mail:dev] To: ${to} | ${p.subject} | CODE: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `${code} is your Campus Lost & Found code`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:440px;margin:auto;padding:24px;color:#16181D">
        <div style="font-size:32px">🔎</div>
        <h2 style="margin:8px 0">${p.heading}</h2>
        <p>Hi ${escapeHtml(name)}, ${p.line.toLowerCase()}</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:8px;background:#ECEAFE;color:#5B4CF0;
                    padding:16px;border-radius:12px;text-align:center">${code}</div>
        <p style="color:#646B78;font-size:13px">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p>
      </div>`,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
