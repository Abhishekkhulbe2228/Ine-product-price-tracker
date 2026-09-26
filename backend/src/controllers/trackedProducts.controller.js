import {
  createTrackedProduct,
  getTrackedProducts,
  getTrackedProductById,
  deactivateTracking,
} from '../services/tracking.service.js';
import { getPriceHistory, getScrapeLogs } from '../services/history.service.js';

export async function createHandler(req, res, next) {
  try {
    const {
      storeProductId,
      productName,
      optionAxis,
      selectedOptionId,
      selectedOptionLabel,
    } = req.body;

    // Validate required fields
    if (!storeProductId || !productName || !selectedOptionId || !selectedOptionLabel) {
      return res.status(400).json({
        error: 'Missing required fields: storeProductId, productName, selectedOptionId, selectedOptionLabel',
      });
    }

    // Validate storeProductId is a number
    const parsedId = parseInt(storeProductId, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: 'storeProductId must be a positive integer' });
    }

    const product = await createTrackedProduct({
      storeProductId: parsedId,
      productName: String(productName).trim(),
      optionAxis: optionAxis ? String(optionAxis).trim() : null,
      selectedOptionId: String(selectedOptionId).trim(),
      selectedOptionLabel: String(selectedOptionLabel).trim(),
    });

    res.status(201).json(product);
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

export async function listHandler(req, res, next) {
  try {
    const products = await getTrackedProducts();
    res.json({ count: products.length, results: products });
  } catch (err) {
    next(err);
  }
}

export async function getByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const product = await getTrackedProductById(id);

    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req, res, next) {
  try {
    const { id } = req.params;
    const product = await deactivateTracking(id);

    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }

    res.json({ message: 'Tracking deactivated', product });
  } catch (err) {
    next(err);
  }
}

export async function historyHandler(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const history = await getPriceHistory(id, limit);
    res.json({ count: history.length, results: history });
  } catch (err) {
    next(err);
  }
}

export async function logsHandler(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const logs = await getScrapeLogs(id, limit);
    res.json({ count: logs.length, results: logs });
  } catch (err) {
    next(err);
  }
}
