const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  // Handle CSV responses
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    return res.blob();
  }

  return res.json();
}

// Product search
export function searchProducts(query) {
  return request(`/api/products/search?q=${encodeURIComponent(query)}`);
}

export function getProductDetails(id) {
  return request(`/api/products/${id}`);
}

// Tracked products
export function getTrackedProducts() {
  return request('/api/tracked-products');
}

export function getTrackedProduct(id) {
  return request(`/api/tracked-products/${id}`);
}

export function trackProduct(data) {
  return request('/api/tracked-products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function stopTracking(id) {
  return request(`/api/tracked-products/${id}`, { method: 'DELETE' });
}

// History & logs
export function getPriceHistory(id) {
  return request(`/api/tracked-products/${id}/history`);
}

export function getScrapeLogs(id) {
  return request(`/api/tracked-products/${id}/logs`);
}

// Scrape
export function triggerManualScrape() {
  return request('/api/scrape/manual', { method: 'POST' });
}

// Export
export function exportCsv() {
  return request('/api/export');
}
