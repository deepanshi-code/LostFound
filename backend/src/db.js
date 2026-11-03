// PostgreSQL everywhere:
// - DATABASE_URL set (e.g. Supabase): a real Postgres server, data survives restarts and redeploys
// - not set (local development): PGlite, an embedded Postgres stored in backend/data/pgdata
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

let client;   // object with query(sql, params) -> { rows }
let closeFn;

if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  pg.types.setTypeParser(20, Number); // BIGINT as a JS number (PGlite already does this)
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Hosted Postgres requires TLS. Supabase's pooler certificate isn't in Node's default CA list.
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 5,
  });
  client = pool;
  closeFn = () => pool.end();
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || path.resolve(import.meta.dirname, '..', 'data', 'pgdata');
  mkdirSync(path.dirname(dir), { recursive: true });
  // A server that was killed (e.g. its terminal closed) leaves postmaster.pid behind, and PGlite then
  // refuses to start. Only one local server uses this folder, so a leftover lock is always stale.
  const lock = path.join(dir, 'postmaster.pid');
  if (existsSync(lock)) rmSync(lock);
  client = new PGlite(dir);
  closeFn = () => client.close();
}

export const usingHostedDb = Boolean(process.env.DATABASE_URL);

// query('SELECT * FROM users WHERE id = $1', [id]) -> array of rows
export async function query(sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}
// First row or undefined
export const one = async (sql, params) => (await query(sql, params))[0];

export const closeDb = () => closeFn();

// Creates tables if they don't exist yet. Safe to run on every start.
export async function initDb() {
  const statements = `
    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT NOT NULL UNIQUE,
      phone          TEXT,
      password_hash  TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS items (
      id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type          TEXT NOT NULL CHECK (type IN ('lost', 'found')),
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      category      TEXT NOT NULL,
      location      TEXT NOT NULL,
      date_occurred TEXT NOT NULL,
      image_path    TEXT,
      status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- A claim is a response to someone else's post:
    --   on a FOUND item: "this is mine" (message should prove ownership)
    --   on a LOST item:  "I found this"  (message says where/how to collect)
    CREATE TABLE IF NOT EXISTS claims (
      id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      claimant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (item_id, claimant_id)
    );

    -- One-time codes for email verification and password reset (stored hashed, times in ms)
    CREATE TABLE IF NOT EXISTS email_codes (
      id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose    TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
      code_hash  TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    );

    -- Added later, so existing databases get it too (on by default)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE INDEX IF NOT EXISTS idx_items_type_status ON items (type, status);
    CREATE INDEX IF NOT EXISTS idx_claims_item ON claims (item_id);
    CREATE INDEX IF NOT EXISTS idx_email_codes_user ON email_codes (user_id, purpose);
  `;
  // Run one statement at a time (the pg pool doesn't allow several in one parameterless call reliably)
  for (const sql of statements.split(';').map((s) => s.trim()).filter((s) => s && !/^--[^\n]*$/.test(s))) {
    await query(sql);
  }
}

// Keep in sync with mobile/src/config.js (which adds icons)
export const CATEGORIES = [
  'Phone', 'Laptop & Tablet', 'Earphones', 'Charger & Cables', 'Gadgets', 'Calculator',
  'ID Card', 'Wallet & Cash', 'Keys', 'Bag', 'Books & Notes', 'Stationery', 'Documents',
  'Clothing', 'Shoes', 'Spectacles', 'Watch', 'Jewellery', 'Bottle & Tiffin', 'Umbrella',
  'Sports Gear', 'Other',
];
