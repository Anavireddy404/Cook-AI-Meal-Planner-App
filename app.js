import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { connectDB } from './db/connection.js';
import usersRouter from './server/routes/users.js';
import mealplansRouter from './server/routes/mealplans.js';
import mealsRouter from './server/routes/meals.js';
import plannerRouter from './server/routes/planner.js';
import subscriptionsRouter, { handleStripeWebhook } from './server/routes/subscriptions.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Serverless instances can be created on demand, so every request confirms a
// shared MongoDB connection is ready before reaching a route.
app.use((req, res, next) => {
  connectDB().then(() => next()).catch(next);
});

// Stripe must receive the original request bytes to verify webhook signatures.
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json({ limit: '100kb' }));

app.use('/api/users', usersRouter);
app.use('/api/mealplans', mealplansRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// Serve the built frontend (frontend/dist) when it exists, e.g. in production.
// In local dev, the frontend runs on its own Vite dev server instead.
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id format' });
  }
  if (err.code === 11000) {
    return res.status(400).json({ message: 'That value is already taken' });
  }
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;

if (!process.env.VERCEL) {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}
