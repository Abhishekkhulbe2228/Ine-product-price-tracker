import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { checkConnection } from './db/supabase.js';

// Routes
import productsRoutes from './routes/products.routes.js';
import trackedProductsRoutes from './routes/trackedProducts.routes.js';
import scrapeRoutes from './routes/scrape.routes.js';
import exportRoutes from './routes/export.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS - restricted to frontend origin
app.use(cors({
  origin: [env.frontendUrl, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (req, res) => {
  const connected = await checkConnection();
  const status = connected ? 'ok' : 'error';
  res.status(connected ? 200 : 503).json({
    status,
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/products', productsRoutes);
app.use('/api/tracked-products', trackedProductsRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/export', exportRoutes);

// Centralized error handler (must be after routes)
app.use(errorHandler);

// Start server
app.listen(env.port, () => {
  logger.info('SERVER', `INE Price Tracker backend running on port ${env.port}`);
  logger.info('SERVER', `Frontend URL: ${env.frontendUrl}`);
  logger.info('SERVER', `Mock store: ${env.mockStoreUrl}`);
});

export default app;
