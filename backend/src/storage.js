// Photo storage:
// - SUPABASE_URL + SUPABASE_SERVICE_KEY set: Supabase Storage (public bucket), survives restarts
// - otherwise: local disk in backend/uploads, served at /uploads
// The database stores either a full https:// URL (Supabase) or a bare file name (local).
import { mkdirSync, unlink, writeFileSync } from 'node:fs';
import path from 'node:path';

export const UPLOAD_DIR = path.resolve(import.meta.dirname, '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'item-photos';
export const usingCloudStorage = Boolean(SUPABASE_URL && SUPABASE_KEY);

// New Supabase secret keys (sb_secret_...) go only in the apikey header; older JWT keys also as a Bearer token
const authHeaders = () => (SUPABASE_KEY.startsWith('eyJ') ? { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } : { apikey: SUPABASE_KEY });

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

// Saves an image and returns what to store in items.image_path
export async function saveImage(buffer, fileName) {
  if (!usingCloudStorage) {
    writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
    return fileName;
  }
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileName)}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': MIME[path.extname(fileName).toLowerCase()] || 'application/octet-stream',
      'x-upsert': 'true',
      'Cache-Control': 'max-age=604800',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Photo upload failed (${res.status}): ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(fileName)}`;
}

export async function deleteImage(stored) {
  if (!stored) return;
  if (!/^https?:\/\//.test(stored)) {
    unlink(path.join(UPLOAD_DIR, stored), () => {});
    return;
  }
  if (!usingCloudStorage) return;
  const name = decodeURIComponent(stored.split(`/public/${BUCKET}/`)[1] || '');
  if (!name) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).catch(() => {});
}

// What the app should load: absolute URLs as they are, local files under /uploads
export const publicImagePath = (stored) => (!stored ? null : /^https?:\/\//.test(stored) ? stored : `/uploads/${stored}`);
