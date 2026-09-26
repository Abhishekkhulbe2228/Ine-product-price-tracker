import { Router } from 'express';
import { searchHandler, getDetailsHandler } from '../controllers/products.controller.js';

const router = Router();

// GET /api/products/search?q=<query>
router.get('/search', searchHandler);

// GET /api/products/:id
router.get('/:id', getDetailsHandler);

export default router;
