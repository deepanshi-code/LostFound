# Campus Lost & Found

A mobile app for colleges, schools and other institutions. People report items they **lost** or **found**, the app suggests **possible matches**, and contact details are shared **only after the poster approves** a response.

## Features

- **Verified campus accounts.** Only institutional email domains can sign up, confirmed with a 6-digit emailed code. Includes password reset.
- **Report in under a minute.** Lost or found, 22 categories, place, date, description and a photo.
- **Browse and search** with Lost/Found and category filters.
- **Automatic matching** of lost reports against found reports.
- **Ownership check.** Claimants must describe a detail that isn't in the post.
- **Privacy by default.** Email and phone are shared only after the poster approves.
- **Light, dark and system themes.**

## Tech stack

| Part | Technology |
|---|---|
| App | Expo SDK 58 (React Native 0.88), React Navigation, runs on Android, iOS and web |
| API | Node.js 22.13+, Express 5, JWT auth, Multer for photo uploads |
| Database | SQLite through Node's built-in `node:sqlite` (no native build step) |
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
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Mail server for verification and reset codes. If empty, codes are printed in the backend terminal. |
| `MAIL_FROM` | Optional sender, e.g. `Campus Lost & Found <you@gmail.com>` |

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
| GET | `/api/items?type=&category=&q=&status=` | Feed (defaults to open items) |
| GET | `/api/items/mine` | My posts, with pending response counts |
| GET | `/api/items/:id` | Detail. The owner also gets responses; others get their own response |
| GET | `/api/items/:id/matches` | Ranked possible matches |
| POST | `/api/items` | multipart: `type, title, category, location, date_occurred, description, image?` |
| PATCH | `/api/items/:id/status` | `{status: "open" \| "resolved"}` (owner only) |
| DELETE | `/api/items/:id` | Owner only |
| POST | `/api/items/:id/claims` | `{message}`: respond to a post |
| GET | `/api/claims/mine` | Responses I sent |
| PATCH | `/api/claims/:id` | `{status: "approved" \| "rejected"}` (poster only) |

## Known limitations / next steps

- **No notifications yet.** Users must open the app to see new responses. Next step: Expo push notifications.
- **Matching is keyword-based.** "Specs" won't match "glasses". Options: a synonym list, or text embeddings, measured against the current baseline.
- **Images are stored on local disk.** To deploy, move them to object storage (e.g. S3 or Cloudinary) and SQLite to Postgres.
- **The token is kept in AsyncStorage.** On native builds, `expo-secure-store` is more secure.
- **No admin/moderation role yet.** An institution would want a lost-property desk account that can hold items and remove spam.
- **Date is a text field.** A native date picker would reduce input errors.

## Licence

Copyright © 2026 Deepanshi Agarwal. All rights reserved. The code is public for viewing and evaluation only; see [LICENSE](LICENSE).
