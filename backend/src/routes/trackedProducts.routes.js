import { Router } from 'express';
import {
  createHandler,
  listHandler,
  getByIdHandler,
  deleteHandler,
  historyHandler,
  logsHandler,
} from '../controllers/trackedProducts.controller.js';

const router = Router();

// POST /api/tracked-products
router.post('/', createHandler);

// GET /api/tracked-products
router.get('/', listHandler);

// GET /api/tracked-products/:id
router.get('/:id', getByIdHandler);

// DELETE /api/tracked-products/:id
router.delete('/:id', deleteHandler);

// GET /api/tracked-products/:id/history
router.get('/:id/history', historyHandler);

// GET /api/tracked-products/:id/logs
router.get('/:id/logs', logsHandler);

export default router;
