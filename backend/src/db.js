import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(import.meta.dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH || path.join(dataDir, 'lostfound.db'));

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    category      TEXT NOT NULL,
    location      TEXT NOT NULL,
    date_occurred TEXT NOT NULL,
    image_path    TEXT,
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- A claim is a response to someone else's post:
  --   on a FOUND item: "this is mine" (message should prove ownership)
  --   on a LOST item:  "I found this"  (message says where/how to collect)
  CREATE TABLE IF NOT EXISTS claims (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claimant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (item_id, claimant_id)
  );

  -- One-time codes for email verification and password reset (stored hashed)
  CREATE TABLE IF NOT EXISTS email_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose    TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
    code_hash  TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_type_status ON items (type, status);
  CREATE INDEX IF NOT EXISTS idx_claims_item ON claims (item_id);
`);

// Added after the first version: existing accounts are treated as already verified
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('email_verified')) {
  db.exec(`
    ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
    UPDATE users SET email_verified = 1;
  `);
}

// Keep in sync with mobile/src/config.js (which adds icons and colours)
export const CATEGORIES = [
  'Phone', 'Laptop & Tablet', 'Earphones', 'Charger & Cables', 'Gadgets', 'Calculator',
  'ID Card', 'Wallet & Cash', 'Keys', 'Bag', 'Books & Notes', 'Stationery', 'Documents',
  'Clothing', 'Shoes', 'Spectacles', 'Watch', 'Jewellery', 'Bottle & Tiffin', 'Umbrella',
  'Sports Gear', 'Other',
];

// Rename categories from the first version so old posts stay valid
db.exec(`
  UPDATE items SET category = 'Gadgets' WHERE category = 'Electronics';
  UPDATE items SET category = 'Wallet & Cash' WHERE category = 'Wallet';
  UPDATE items SET category = 'Bottle & Tiffin' WHERE category = 'Bottle';
`);
