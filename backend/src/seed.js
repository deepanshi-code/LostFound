// Fills the database with demo users and items so the app has something to show.
// Demo logins (password for both: demo1234):
//   aisha@campus.test   — posted mostly found items
//   rohan@campus.test   — posted mostly lost items
//
// Photos: put image files in backend/seed-images/ named after the item (e.g. water-bottle.jpg).
// Any item whose photo is missing simply shows its category icon.
//
// Run directly (npm run seed) to wipe and refill, or call seedDemo() from the server.
import bcrypt from 'bcryptjs';
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { closeDb, initDb, query } from './db.js';
import { saveImage, UPLOAD_DIR, usingCloudStorage } from './storage.js';

const SEED_IMAGES = path.resolve(import.meta.dirname, '..', 'seed-images');
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

// Uploads seed-images/<photo>.(jpg|jpeg|png|webp) and returns the stored path
async function seedPhoto(photo) {
  const file = ['.jpg', '.jpeg', '.png', '.webp'].map((ext) => photo + ext).find((f) => existsSync(path.join(SEED_IMAGES, f)));
  if (!file) return null;
  return saveImage(readFileSync(path.join(SEED_IMAGES, file)), `seed-${file}`);
}

export async function seedDemo() {
  await initDb();
  await query('TRUNCATE email_codes, claims, items, users RESTART IDENTITY CASCADE');
  // Remove local photos from the previous seed (prefixed "seed-"), keep anything users uploaded.
  // In cloud storage, seed photos have fixed names and are simply overwritten.
  if (!usingCloudStorage) {
    for (const f of readdirSync(UPLOAD_DIR)) if (f.startsWith('seed-')) unlinkSync(path.join(UPLOAD_DIR, f));
  }

  const hash = bcrypt.hashSync('demo1234', 10);
  const addUser = async (name, email, phone) =>
    (await query('INSERT INTO users (name, email, phone, password_hash, email_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING id',
      [name, email, phone, hash]))[0].id;
  const aisha = await addUser('Aisha Verma', 'aisha@campus.test', '9000000001');
  const rohan = await addUser('Rohan Mehta', 'rohan@campus.test', '9000000002');

  // hoursAgo sets created_at so the feed shows a realistic spread of "2h ago", "3d ago", ...
  let photos = 0;
  const item = async (user, type, title, description, category, location, days, hoursAgo, photo, status = 'open') => {
    const image = await seedPhoto(photo);
    if (image) photos++;
    await query(`
      INSERT INTO items (user_id, type, title, description, category, location, date_occurred, status, image_path, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - make_interval(hours => $10))`,
      [user, type, title, description, category, location, daysAgo(days), status, image, hoursAgo]);
  };

  await item(aisha, 'found', 'Black HP laptop charger', 'Left plugged in near the back row.', 'Charger & Cables', 'Library 2nd floor', 1, 20, 'laptop-charger');
  await item(aisha, 'found', 'Blue steel water bottle', 'Milton bottle with a dent and stickers.', 'Bottle & Tiffin', 'Main canteen', 0, 2, 'water-bottle');
  await item(aisha, 'found', 'Bunch of keys with red keychain', 'Three keys, one looks like a bike key.', 'Keys', 'Parking lot B', 3, 70, 'keys');
  await item(aisha, 'found', 'Casio scientific calculator', 'fx-991, name scratched off the back.', 'Calculator', 'Exam hall 3', 1, 26, 'calculator');
  await item(aisha, 'found', 'Black umbrella', 'Foldable, left at the bus stop bench.', 'Umbrella', 'Gate 2 bus stop', 4, 96, 'umbrella', 'resolved');
  await item(rohan, 'lost', 'HP laptop charger', 'Black 65W HP charger, small tape on cable.', 'Charger & Cables', 'Library', 1, 18, 'laptop-charger-2');
  await item(rohan, 'lost', 'Student ID card', 'B.Tech CSE ID card in a transparent holder.', 'ID Card', 'Block A, Room 204', 2, 40, 'id-card');
  await item(rohan, 'lost', 'White earbuds case', 'Boat earbuds, case only, has a small crack.', 'Earphones', 'Sports complex', 2, 45, 'earbuds');
  await item(rohan, 'lost', 'Black metal-frame spectacles', 'Rectangular power glasses, thin black frame. Really need them!', 'Spectacles', 'Seminar hall', 0, 5, 'spectacles');
  await item(rohan, 'lost', 'Badminton racket', 'Yonex, blue grip tape.', 'Sports Gear', 'Indoor court', 5, 120, 'badminton-racket', 'resolved');

  console.log(`Seeded demo data (${photos}/10 items with photos). Log in with aisha@campus.test or rohan@campus.test / demo1234`);
}

// `npm run seed`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedDemo();
  await closeDb();
}
