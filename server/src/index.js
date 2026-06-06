import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dashboardRoutes from './routes/dashboard.js';
import quickbooksAuthRoutes from './routes/quickbooksAuth.js';
import quickbooksRoutes from './routes/quickbooks.js';
import assistantRoutes from './routes/assistant.js';
import jobsRoutes from './routes/jobs.js';
import billingRoutes, { webhookHandler } from './routes/billing.js';
import cronRoutes from './routes/cron.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Stripe webhook needs the raw request body for signature verification, so it
// MUST be registered before the JSON body parser.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', dashboardRoutes);
app.use('/api', quickbooksAuthRoutes);
app.use('/api', quickbooksRoutes);
app.use('/api', assistantRoutes);
app.use('/api', jobsRoutes);
app.use('/api', billingRoutes);
app.use('/api', cronRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// On Vercel the app runs as a serverless function (the exported app is the
// request handler). Locally we start a normal HTTP listener.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Ground Up API listening on http://localhost:${PORT}`);
  });
}

export default app;
