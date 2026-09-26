import { Router } from 'express';
import { exportCsvHandler } from '../controllers/export.controller.js';

const router = Router();

// GET /api/export
router.get('/', exportCsvHandler);

export default router;
