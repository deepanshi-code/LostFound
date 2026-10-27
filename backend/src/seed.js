// Fills the database with demo users and items so the app has something to show.
// Demo logins (password for both: demo1234):
//   aisha@campus.test   — posted mostly found items
//   rohan@campus.test   — posted mostly lost items
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

db.exec('DELETE FROM email_codes; DELETE FROM claims; DELETE FROM items; DELETE FROM users;');

const hash = bcrypt.hashSync('demo1234', 10);
const addUser = db.prepare('INSERT INTO users (name, email, phone, password_hash, email_verified) VALUES (?, ?, ?, ?, 1)');
const aisha = addUser.run('Aisha Verma', 'aisha@campus.test', '9000000001', hash).lastInsertRowid;
const rohan = addUser.run('Rohan Mehta', 'rohan@campus.test', '9000000002', hash).lastInsertRowid;

// hoursAgo sets created_at so the feed shows a realistic spread of "2h ago", "3d ago", ...
const addItem = db.prepare(`
  INSERT INTO items (user_id, type, title, description, category, location, date_occurred, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
const item = (user, type, title, description, category, location, days, hoursAgo, status = 'open') =>
  addItem.run(user, type, title, description, category, location, daysAgo(days), status, `-${hoursAgo} hours`);

item(aisha, 'found', 'Black HP laptop charger', 'Left plugged in near the back row.', 'Charger & Cables', 'Library 2nd floor', 1, 20);
item(aisha, 'found', 'Blue steel water bottle', 'Milton bottle with a dent and stickers.', 'Bottle & Tiffin', 'Main canteen', 0, 2);
item(aisha, 'found', 'Bunch of keys with red keychain', 'Three keys, one looks like a bike key.', 'Keys', 'Parking lot B', 3, 70);
item(aisha, 'found', 'Casio scientific calculator', 'fx-991, name scratched off the back.', 'Calculator', 'Exam hall 3', 1, 26);
item(aisha, 'found', 'Black umbrella', 'Foldable, left at the bus stop bench.', 'Umbrella', 'Gate 2 bus stop', 4, 96, 'resolved');
item(rohan, 'lost', 'HP laptop charger', 'Black 65W HP charger, small tape on cable.', 'Charger & Cables', 'Library', 1, 18);
item(rohan, 'lost', 'Student ID card', 'B.Tech CSE ID card in a transparent holder.', 'ID Card', 'Block A, Room 204', 2, 40);
item(rohan, 'lost', 'White earbuds case', 'Boat earbuds, case only, has a small crack.', 'Earphones', 'Sports complex', 2, 45);
item(rohan, 'lost', 'Round black spectacles', 'In a brown case. Power glasses, really need them!', 'Spectacles', 'Seminar hall', 0, 5);
item(rohan, 'lost', 'Badminton racket', 'Yonex, blue grip tape.', 'Sports Gear', 'Indoor court', 5, 120, 'resolved');

console.log('Seeded demo data. Log in with aisha@campus.test or rohan@campus.test / demo1234');
