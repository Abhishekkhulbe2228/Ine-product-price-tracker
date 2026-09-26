import { Router } from 'express';
import { authenticateCron } from '../middleware/auth.js';
import { cronScrapeHandler, manualScrapeHandler } from '../controllers/scrape.controller.js';

const router = Router();

// POST /api/scrape/run - Protected by cron secret
router.post('/run', authenticateCron, cronScrapeHandler);

// POST /api/scrape/manual - For dashboard trigger (no cron auth needed)
router.post('/manual', manualScrapeHandler);

export default router;
