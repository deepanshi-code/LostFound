// Checks the email settings in .env (Brevo or SMTP) and sends one test code email.
// Usage: npm run mail-test -- you@geu.ac.in
// Uses process.exitCode (not process.exit) so messages are flushed before Node exits.
import { sendCode, smtpStatus } from './mailer.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mail-test -- your.address@example.com');
  process.exitCode = 1;
} else {
  const status = await smtpStatus();
  if (!status.ok) {
    console.error(`\n✗ ${status.message}\n`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${status.message}`);
    try {
      await sendCode(to, 'there', '123456', 'verify');
      console.log(`✓ Test email sent to ${to}. Check the inbox (and spam folder). The code inside is just 123456.`);
    } catch (e) {
      console.error(`✗ Sending failed: ${e.message}`);
      process.exitCode = 1;
    }
  }
}
