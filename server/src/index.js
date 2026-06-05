import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', dashboardRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Ground Up API listening on http://localhost:${PORT}`);
});
