# Campus Lost & Found

A mobile app for colleges, schools and other institutions. People report items they **lost** or **found**, the app suggests **possible matches**, and contact details are shared **only after the poster approves** a response.

**Live demo: [lostfound-mobile.vercel.app](https://lostfound-mobile.vercel.app)**

Log in with a demo account (password `demo1234`): `rohan@campus.test` or `aisha@campus.test`.

> The demo runs on free hosting. If it hasn't been used for a while, the first login can take about 30 seconds while the server wakes up. Demo accounts are shared, so please keep posts tidy.

## Features

- **Verified campus accounts.** Only institutional email domains can sign up, confirmed with a 6-digit emailed code. Includes password reset.
- **Report in under a minute.** Lost or found, 22 categories, place, date, description and a photo.
- **Browse and search** with Lost/Found and category filters.
- **Automatic matching** of lost reports against found reports.
- **Ownership check.** Claimants must describe a detail that isn't in the post.
- **Privacy by default.** Email and phone are shared only after the poster approves.
- **Email notifications** when someone responds to your post, when your response is approved or declined, and when a new post looks like a match for yours. Each email links straight to the item. Can be turned off in Profile.
- **Light, dark and system themes.**

## Tech stack

| Part | Technology |
|---|---|
| App | Expo SDK 58 (React Native 0.88), React Navigation, runs on Android, iOS and web |
| API | Node.js 22.13+, Express 5, JWT auth, Multer for photo uploads |
| Database | PostgreSQL: Supabase in production, [PGlite](https://pglite.dev) (embedded Postgres, nothing to install) for local development |
| Photos | Supabase Storage in production, local disk in development |
| Email | Nodemailer over any SMTP provider |

```
mobile/   Expo app
backend/  REST API and database
```

## Getting started

Requires **Node.js 22.13 or newer**.

```bash
npm run setup     # install backend and app dependencies
npm run seed      # create the database with demo data
```

Copy `backend/.env.example` to `backend/.env` and adjust it (see [Configuration](#configuration-backend)).

Then run each in its own terminal:

```bash
npm run backend   # API on http://localhost:4000, reloads on change
npm run app       # Expo dev server (scan the QR code with Expo Go)
```

`npm run web` opens the app in a browser instead.

Demo photos come from `backend/seed-images/` (public domain, see its `CREDITS.md`). To use your own, save a photo there with the item's file name (e.g. `keys.jpg`) and run `npm run seed` again.

Demo accounts created by the seed (password `demo1234`, already verified):
- `aisha@campus.test`: posted the found items
- `rohan@campus.test`: posted the lost items

- **On your phone:** install **Expo Go** from the Play Store / App Store and scan the QR code. The phone and the laptop must be on the **same Wi-Fi**. The app finds the backend automatically at `http://<your-laptop-ip>:4000`. If it can't connect, allow Node.js through Windows Firewall (Private networks).
- **In a browser:** press `w` in the Expo terminal.
- **Android emulator:** press `a`.

To use a deployed backend instead, set `EXPO_PUBLIC_API_URL=https://your-server.example` before `npx expo start`.

## Configuration (backend)

Copy `backend/.env.example` to `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `JWT_SECRET` | Secret used to sign login tokens. **Must** be set to a long random value anywhere other than your laptop. |
| `ALLOWED_EMAIL_DOMAIN` | Only these email domains can sign up, comma-separated, e.g. `geu.ac.in,gehu.ac.in`. The match is exact: subdomains and look-alikes are rejected. Empty means anyone can sign up. |
| `BREVO_API_KEY` | Sends codes through Brevo's HTTPS API (free: 300 emails a day). Needed on Render's free plan, which blocks SMTP. Takes priority over SMTP. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Mail server for verification and reset codes (fine locally). If no email is configured, codes are printed in the backend terminal. |
| `APP_URL` | Web app address used for links in notification emails (default `https://lostfound-mobile.vercel.app`). |
| `MAIL_FROM` | Sender, e.g. `Campus Lost & Found <you@gmail.com>`. With Brevo it must be a sender address verified in Brevo. |

### Email verification

1. **Sign up.** The account is created unverified and a 6-digit code is emailed.
2. **Enter the code** in the app. The account is verified and you're logged in.
3. **Logging in before verifying** sends a fresh code and opens the verify screen.
4. **Forgot password** emails a reset code. Entering it with a new password logs you in.

Codes expire after 10 minutes and allow 5 wrong attempts. A new code can be requested once a minute. Codes are stored hashed and deleted once used. All `/api/auth` routes are limited to 50 requests per 15 minutes per IP.

**Sending real email with Gmail:**
1. Turn on 2-Step Verification for the Google account.
2. Create an App Password at Google Account → Security → App passwords.
3. Put the values in `backend/.env`. Never commit this file; it's already in `.gitignore`.
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.address@gmail.com
SMTP_PASS=your-16-char-app-password
```
4. Restart the backend. It prints `[mail] SMTP ready` when the login works.

Gmail allows roughly 500 emails a day, which is fine for a pilot. For a whole college, use a transactional email service (for example Brevo, Resend or Amazon SES) with your own domain, so codes don't land in spam.

## Deployment

The repository includes config for free hosting:

| Part | Host | Config |
|---|---|---|
| API | [Render](https://render.com) | `render.yaml` (Blueprint) |
| Web app | [Netlify](https://netlify.com) | `netlify.toml` |

1. **API and web app:** in Render choose **New → Blueprint**, pick this repository and apply. Note the service URL, e.g. `https://lostfound-api.onrender.com`. Optionally fill in the `SMTP_*` variables in the dashboard to send real emails.
2. **Alternatives for the web app:** Vercel (`mobile/vercel.json`, set Root Directory to `mobile`) or Netlify (`netlify.toml`). Add the environment variable `EXPO_PUBLIC_API_URL` = the API URL, then deploy.

**Permanent data (Supabase, free):**
1. Create a project at [supabase.com](https://supabase.com).
2. In **Storage**, create a **public** bucket named `item-photos`.
3. Click **Connect → Connection string → Session pooler** and copy the URI, putting in your database password. The session pooler works from IPv4-only hosts such as Render.
4. In **Project Settings → API Keys**, copy the **Project URL** and a **secret** (or legacy `service_role`) key.
5. In Render, open **lostfound-api → Environment** and set `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. On the first start the API creates its tables and loads the demo data once.

Without these settings, the API falls back to an embedded database and local photos, which Render's free disk wipes on every restart. Render's free API also sleeps after about 15 minutes idle, so the first request then takes around 30 s.

## How it works

1. **Report.** Choose lost or found, then add a title, category, place, date, description and an optional photo.
2. **Match.** When you open your own post, the app lists items of the opposite type in the same category, ranked by:
   - keyword overlap (Jaccard similarity) between titles and descriptions: 70%
   - same location word: +15%
   - dates within 2 days: +15% (within a week: +5%)

   See `backend/src/matching.js`. It's rule-based on purpose: transparent, needs no training data, and easy to evaluate.
3. **Respond.** On a found item, "This is mine" asks the claimant to describe a detail that **isn't in the post**. That's the ownership check. On a lost item, "I found this" asks where it was found.
4. **Approve.** The poster approves or declines. Email and phone are revealed to both sides **only** after approval.
5. **Close.** After the handover, the poster marks the item returned and it leaves the feed.

## Look and feel

- **Themes:** Light (white-grey), Dark, or Device (follows the phone/computer setting). Change it in **Profile → Appearance**; the choice is saved on the device. Colours live in `mobile/src/theme.js`.
- **Design system:** clean and minimal. Neutral surfaces, one brand blue for actions, and muted red/green used only for Lost/Found status. Inter font (`@expo-google-fonts/inter`) and Ionicons outline icons. No emojis in the UI.
- **Building blocks** are in `mobile/src/ui.js` (Button, Field, Chip, Segmented, StatusPill, ListRow, Banner…). Build new screens from these so the app stays consistent.
- **Category icons** are Ionicons names in `mobile/src/config.js`.
- **22 categories.** The list exists in two places and must match: `mobile/src/config.js` and `backend/src/db.js`.

## API

All routes except register and login need `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password, phone?}`: emails a code, returns `{needsVerification, email}` |
| POST | `/api/auth/login` | `{email, password}` returns `{token, user}`, or 403 `{needsVerification}` if unverified |
| POST | `/api/auth/verify` | `{email, code}` returns `{token, user}` |
| POST | `/api/auth/resend` | `{email, purpose: "verify" \| "reset"}`: new code, at most once a minute |
| POST | `/api/auth/forgot` | `{email}`: emails a reset code (same reply whether or not the account exists) |
| POST | `/api/auth/reset` | `{email, code, password}` returns `{token, user}` |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/me` | `{notify_email: true \| false}`: turn notification emails on or off |
| GET | `/api/items?type=&category=&q=&status=` | Feed (defaults to open items) |
| GET | `/api/items/mine` | My posts, with pending response counts |
| GET | `/api/items/:id` | Detail. The owner also gets responses; others get their own response |
| GET | `/api/items/:id/matches` | Ranked possible matches |
| POST | `/api/items` | multipart: `type, title, category, location, date_occurred, description, image?` |
| PATCH | `/api/items/:id/status` | `{status: "open" \| "resolved"}` (owner only) |
| DELETE | `/api/items/:id` | Owner only |
| POST | `/api/items/:id/claims` | `{message}`: respond to a post |
| GET | `/api/claims/mine` | Responses I sent |
| GET | `/api/claims/pending-count` | Responses waiting for my decision (Activity badge) |
| PATCH | `/api/claims/:id` | `{status: "approved" \| "rejected"}` (poster only) |

## Known limitations / next steps

- **Notifications are email only.** Phone push notifications (Expo push) would be faster. Demo accounts on `@campus.test` never get emails, and Brevo's free plan allows 300 emails a day.
- **Matching is keyword-based.** "Specs" won't match "glasses". Options: a synonym list, or text embeddings, measured against the current baseline.
- **Free-tier limits.** Supabase free: 500 MB database and 1 GB photos, and the project pauses after a week without traffic (resume it in the dashboard). Photos are not resized yet; resizing on upload would save space.
- **The token is kept in AsyncStorage.** On native builds, `expo-secure-store` is more secure.
- **No admin/moderation role yet.** An institution would want a lost-property desk account that can hold items and remove spam.
- **Date is a text field.** A native date picker would reduce input errors.

## Licence

Copyright © 2026 Deepanshi Agarwal. All rights reserved. The code is public for viewing and evaluation only; see [LICENSE](LICENSE).
