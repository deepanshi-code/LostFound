// Email notifications. Each one is sent in the background: a slow or failed email never blocks
// or breaks the request that caused it. Contact details are never put in an email.
import { one } from './db.js';
import { sendNotice } from './mailer.js';

// Skip people who turned emails off, and reserved test domains like the demo's @campus.test
// (they can't receive mail and would only use up the daily sending quota)
const canEmail = (user) => user && user.notify_email && !/\.(test|example|invalid|localhost)$/i.test(user.email);

const getUser = (id) => one('SELECT id, name, email, notify_email FROM users WHERE id = $1', [id]);

function send(user, notice) {
  if (!canEmail(user)) return;
  sendNotice(user.email, user.name, notice).catch((e) => console.error('[notify] send failed:', e.message));
}

// Someone responded to a post: tell the poster
export async function notifyNewResponse(item, responderName) {
  const poster = await getUser(item.user_id);
  const isFound = item.type === 'found';
  send(poster, {
    subject: isFound ? `Someone says "${item.title}" is theirs` : `Someone may have found your ${item.title}`,
    heading: isFound ? 'Someone thinks this is theirs' : 'Someone may have found it',
    lines: [
      isFound
        ? `${responderName} responded to your found post "${item.title}" and described how they know it is theirs.`
        : `${responderName} responded to your lost post "${item.title}" and says they may have found it.`,
      'Open the post to read their message, then approve or decline. Contact details are shared only if you approve.',
    ],
    button: 'Review response',
    link: `/item/${item.id}`,
  });
}

// The poster approved or declined a response: tell the person who responded
export async function notifyDecision(claim, status) {
  const item = await one('SELECT id, title, type FROM items WHERE id = $1', [claim.item_id]);
  const responder = await getUser(claim.claimant_id);
  if (!item) return;
  const approved = status === 'approved';
  send(responder, {
    subject: approved ? `Approved: ${item.title}` : `Update on ${item.title}`,
    heading: approved ? 'Your response was approved' : 'Your response was declined',
    lines: approved
      ? [
          `The poster of "${item.title}" approved your response.`,
          'Open the item in the app to see their contact details and arrange a handover somewhere public on campus.',
        ]
      : [
          `The poster of "${item.title}" declined your response. It may not have matched what they were looking for.`,
          'Keep an eye on new posts. Matching items are suggested automatically.',
        ],
    button: approved ? 'See contact details' : 'Open the item',
    link: `/item/${item.id}`,
  });
}

// A new post looks like a match for existing posts: tell their owners (top 3, one email each)
export async function notifyMatches(item, matches) {
  const notified = new Set();
  for (const m of matches) {
    if (notified.size >= 3) break;
    // 0.35 needs some shared words, not just the same place and day
    if (m.match_score < 0.35 || notified.has(m.user_id)) continue;
    notified.add(m.user_id);
    const owner = await getUser(m.user_id);
    const lostByOwner = m.type === 'lost';
    send(owner, {
      subject: lostByOwner ? `A found item may be your ${m.title}` : `Someone may have lost the ${m.title} you found`,
      heading: lostByOwner ? 'This might be yours' : 'This might be its owner',
      lines: [
        lostByOwner
          ? `Someone just posted a found item, "${item.title}" at ${item.location}, that looks similar to your lost post "${m.title}".`
          : `Someone just posted a lost item, "${item.title}" near ${item.location}, that looks similar to "${m.title}" you found.`,
        'Have a look, and respond if it is a match.',
      ],
      button: 'See the post',
      link: `/item/${item.id}`,
    });
  }
}
