import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrackedProducts, triggerManualScrape, exportCsv, stopTracking } from '../services/api';

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrackedProducts();
      setProducts(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleScrape() {
    try {
      setScraping(true);
      const result = await triggerManualScrape();
      alert(`Scrape complete! ${result.successful}/${result.processed} successful`);
      fetchProducts(); // Refresh data
    } catch (err) {
      alert(`Scrape failed: ${err.message}`);
    } finally {
      setScraping(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scrape-history.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  }

  async function handleStopTracking(id, name) {
    if (!confirm(`Stop tracking "${name}"?`)) return;
    try {
      await stopTracking(id);
      fetchProducts();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  function formatPrice(price, currency = '₹') {
    if (price == null) return '—';
    return `${currency}${Number(price).toLocaleString('en-IN')}`;
  }

  function formatStock(stock) {
    if (stock == null) return '—';
    if (stock === 0) return 'Sold out';
    return `${stock} in stock`;
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'Never';
    const d = new Date(timestamp);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading tracked products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>⚠️ {error}</p>
        <button className="btn" onClick={fetchProducts} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  const activeProducts = products.filter(p => p.is_active);
  const inactiveProducts = products.filter(p => !p.is_active);

  return (
    <div>
      <div className="page-header">
        <h1>Price Tracker Dashboard</h1>
        <p>
          Monitoring {activeProducts.length} product{activeProducts.length !== 1 ? 's' : ''}
          {inactiveProducts.length > 0 && ` · ${inactiveProducts.length} inactive`}
        </p>
      </div>

      <div className="action-bar">
        <button
          id="btn-scrape"
          className="btn btn-primary"
          onClick={handleScrape}
          disabled={scraping || activeProducts.length === 0}
        >
          {scraping ? '⏳ Scraping...' : '🔄 Run Scrape Now'}
        </button>
        <button id="btn-export" className="btn" onClick={handleExport}>
          📥 Export CSV
        </button>
        <button className="btn" onClick={() => navigate('/search')}>
          ➕ Track Product
        </button>
      </div>

      {activeProducts.length === 0 ? (
        <div className="empty-state">
          <p>No products being tracked yet.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/search')}
            style={{ marginTop: '1rem' }}
          >
            Search & Track Products
          </button>
        </div>
      ) : (
        <div className="tracked-grid">
          {activeProducts.map(product => {
            const lp = product.latest_price;
            const ls = product.latest_scrape;

            return (
              <div key={product.id} className="card tracked-card">
                <div className="card-body">
                  <div className="tracked-card-header">
                    <div>
                      <div className="product-category">{product.option_axis || 'Product'}</div>
                      <div className="tracked-card-title">{product.product_name}</div>
                      <div className="tracked-card-option">
                        {product.selected_option_label} · ID: {product.store_product_id}
                      </div>
                    </div>
                    {ls && (
                      <span className={`badge ${
                        ls.outcome === 'success' ? 'badge-success' :
                        ls.outcome === 'failed' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {ls.outcome}
                      </span>
                    )}
                  </div>

                  {lp ? (
                    <div className="price-display">
                      <span className="price-current">{formatPrice(lp.price)}</span>
                      <span className={`stock-status ${lp.stock > 0 ? 'stock-in' : 'stock-out'}`}>
                        {formatStock(lp.stock)}
                      </span>
                    </div>
                  ) : (
                    <div className="price-display">
                      <span className="price-current" style={{ color: 'var(--ink-muted)' }}>
                        No data yet
                      </span>
                    </div>
                  )}

                  <div className="tracked-card-footer">
                    <span className="tracked-card-time">
                      {lp ? `Last scraped: ${formatTime(lp.scraped_at)}` : 'Not yet scraped'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Details
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleStopTracking(product.id, product.product_name)}
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
