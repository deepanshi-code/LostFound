// Fills the database with demo users and items so the app has something to show.
// Demo logins (password for both: demo1234):
//   aisha@campus.test   — posted mostly found items
//   rohan@campus.test   — posted mostly lost items
//
// Photos: put image files in backend/seed-images/ named after the item (e.g. water-bottle.jpg).
// Any item whose photo is missing simply shows its category icon.
import bcrypt from 'bcryptjs';
import { copyFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { db } from './db.js';
import { UPLOAD_DIR } from './routes/items.js';

const SEED_IMAGES = path.resolve(import.meta.dirname, '..', 'seed-images');
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

db.exec('DELETE FROM email_codes; DELETE FROM claims; DELETE FROM items; DELETE FROM users;');
// Remove photos from the previous seed (they are prefixed "seed-"), keep anything users uploaded
for (const f of readdirSync(UPLOAD_DIR)) if (f.startsWith('seed-')) unlinkSync(path.join(UPLOAD_DIR, f));

const hash = bcrypt.hashSync('demo1234', 10);
const addUser = db.prepare('INSERT INTO users (name, email, phone, password_hash, email_verified) VALUES (?, ?, ?, ?, 1)');
const aisha = addUser.run('Aisha Verma', 'aisha@campus.test', '9000000001', hash).lastInsertRowid;
const rohan = addUser.run('Rohan Mehta', 'rohan@campus.test', '9000000002', hash).lastInsertRowid;

// Copies seed-images/<photo>.(jpg|jpeg|png|webp) into uploads and returns the stored file name
function seedPhoto(photo) {
  const file = ['.jpg', '.jpeg', '.png', '.webp'].map((ext) => photo + ext).find((f) => existsSync(path.join(SEED_IMAGES, f)));
  if (!file) return null;
  const stored = `seed-${file}`;
  copyFileSync(path.join(SEED_IMAGES, file), path.join(UPLOAD_DIR, stored));
  return stored;
}

// hoursAgo sets created_at so the feed shows a realistic spread of "2h ago", "3d ago", ...
const addItem = db.prepare(`
  INSERT INTO items (user_id, type, title, description, category, location, date_occurred, status, image_path, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
let photos = 0;
const item = (user, type, title, description, category, location, days, hoursAgo, photo, status = 'open') => {
  const image = seedPhoto(photo);
  if (image) photos++;
  addItem.run(user, type, title, description, category, location, daysAgo(days), status, image, `-${hoursAgo} hours`);
};

item(aisha, 'found', 'Black HP laptop charger', 'Left plugged in near the back row.', 'Charger & Cables', 'Library 2nd floor', 1, 20, 'laptop-charger');
item(aisha, 'found', 'Blue steel water bottle', 'Milton bottle with a dent and stickers.', 'Bottle & Tiffin', 'Main canteen', 0, 2, 'water-bottle');
item(aisha, 'found', 'Bunch of keys with red keychain', 'Three keys, one looks like a bike key.', 'Keys', 'Parking lot B', 3, 70, 'keys');
item(aisha, 'found', 'Casio scientific calculator', 'fx-991, name scratched off the back.', 'Calculator', 'Exam hall 3', 1, 26, 'calculator');
item(aisha, 'found', 'Black umbrella', 'Foldable, left at the bus stop bench.', 'Umbrella', 'Gate 2 bus stop', 4, 96, 'umbrella', 'resolved');
item(rohan, 'lost', 'HP laptop charger', 'Black 65W HP charger, small tape on cable.', 'Charger & Cables', 'Library', 1, 18, 'laptop-charger-2');
item(rohan, 'lost', 'Student ID card', 'B.Tech CSE ID card in a transparent holder.', 'ID Card', 'Block A, Room 204', 2, 40, 'id-card');
item(rohan, 'lost', 'White earbuds case', 'Boat earbuds, case only, has a small crack.', 'Earphones', 'Sports complex', 2, 45, 'earbuds');
item(rohan, 'lost', 'Black metal-frame spectacles', 'Rectangular power glasses, thin black frame. Really need them!', 'Spectacles', 'Seminar hall', 0, 5, 'spectacles');
item(rohan, 'lost', 'Badminton racket', 'Yonex, blue grip tape.', 'Sports Gear', 'Indoor court', 5, 120, 'badminton-racket', 'resolved');

console.log(`Seeded demo data (${photos}/10 items with photos). Log in with aisha@campus.test or rohan@campus.test / demo1234`);
