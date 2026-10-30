// Interactive helper: asks for a Gmail address and App Password and writes them to backend/.env.
// The password is hidden while typing and is never printed.
// Usage: npm run setup-email
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const envPath = path.resolve(import.meta.dirname, '..', '.env');
const examplePath = path.resolve(import.meta.dirname, '..', '.env.example');
if (!existsSync(envPath)) copyFileSync(examplePath, envPath);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let muted = false;
rl._writeToOutput = (s) => { if (!muted || s.includes('\n')) rl.output.write(muted ? '\n' : s); };
const ask = (q, hidden = false) => new Promise((resolve) => {
  rl.question(q, (answer) => { muted = false; resolve(answer.trim()); });
  muted = hidden;
});

console.log('\nCampus Lost & Found — email setup (Gmail)\n');
const user = await ask('Gmail address to send from: ');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
  console.error('That does not look like an email address. Nothing was changed.');
  process.exit(1);
}
const pass = (await ask('16-letter App Password (hidden while you type): ', true)).replace(/\s+/g, '');
rl.close();
if (pass.length !== 16) {
  console.error(`\nExpected 16 letters but got ${pass.length}. Nothing was changed.`);
  console.error('Create one at https://myaccount.google.com/apppasswords (needs 2-Step Verification).');
  process.exit(1);
}

const values = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: user,
  SMTP_PASS: pass,
  MAIL_FROM: `Campus Lost & Found <${user}>`,
};
let lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const [key, value] of Object.entries(values)) {
  const i = lines.findIndex((l) => l.replace(/\s/g, '').startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}
writeFileSync(envPath, lines.join('\n').replace(/\n*$/, '\n'));
console.log(`\n✓ Saved to backend/.env (sending as ${user}).`);
console.log('Next: npm run mail-test -- your.address@example.com\n');
