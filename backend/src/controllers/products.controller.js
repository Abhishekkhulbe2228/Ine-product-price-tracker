import { searchProducts, getProductDetails } from '../services/productSearch.service.js';

export async function searchHandler(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Sanitize: max 100 chars, no special injection
    const sanitized = q.trim().substring(0, 100);
    const results = await searchProducts(sanitized);

    res.json({ query: sanitized, count: results.length, results });
  } catch (err) {
    next(err);
  }
}

export async function getDetailsHandler(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await getProductDetails(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}
