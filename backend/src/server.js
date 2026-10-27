import express from 'express';
import cors from 'cors';
import multer from 'multer';
import authRoutes from './routes/auth.js';
import itemRoutes, { UPLOAD_DIR } from './routes/items.js';
import claimRoutes from './routes/claims.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5 MB' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err.message === 'Only image files are allowed') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = Number(process.env.PORT) || 4000;
// 0.0.0.0 so a phone on the same Wi-Fi can reach the API
app.listen(PORT, '0.0.0.0', () => console.log(`Lost & Found API running on http://localhost:${PORT}`));
