import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { getTrackedProduct, getPriceHistory, getScrapeLogs, stopTracking } from '../services/api';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // chart | logs

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [productData, historyData, logsData] = await Promise.all([
        getTrackedProduct(id),
        getPriceHistory(id),
        getScrapeLogs(id),
      ]);

      setProduct(productData);
      setHistory(historyData.results || []);
      setLogs(logsData.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStop() {
    if (!confirm(`Stop tracking "${product?.product_name}"?`)) return;
    try {
      await stopTracking(id);
      navigate('/');
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  function formatPrice(price) {
    if (price == null) return '—';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  }

  function formatTime(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatShortTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="error-state">
        <p>⚠️ {error || 'Product not found'}</p>
        <button className="btn" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const lp = product.latest_price;

  // Prepare chart data
  const chartData = history.map(h => ({
    time: formatShortTime(h.scraped_at),
    price: Number(h.price),
    stock: h.stock,
  }));

  // Price stats
  const prices = history.map(h => Number(h.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  return (
    <div>
      {/* Header */}
      <button
        className="btn btn-sm"
        onClick={() => navigate('/')}
        style={{ marginBottom: '1rem' }}
      >
        ← Back to Dashboard
      </button>

      <div className="detail-header">
        <div className="detail-info">
          <div className="product-category">{product.option_axis || 'Product'}</div>
          <h1>{product.product_name}</h1>
          <div className="detail-meta">
            <span>Option: <strong>{product.selected_option_label}</strong></span>
            <span>Store ID: {product.store_product_id}</span>
            <span className={`badge ${product.is_active ? 'badge-success' : 'badge-neutral'}`}>
              {product.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          <a
            className="btn btn-sm"
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View in Store ↗
          </a>
          {product.is_active && (
            <button className="btn btn-sm btn-danger" onClick={handleStop}>
              Stop Tracking
            </button>
          )}
        </div>
      </div>

      {/* Current Price Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: '0.25rem' }}>
                Current Price
              </div>
              <div className="price-display">
                <span className="price-current">{formatPrice(lp?.price)}</span>
                {lp && (
                  <span className={`stock-status ${lp.stock > 0 ? 'stock-in' : 'stock-out'}`}>
                    {lp.stock > 0 ? `${lp.stock} in stock` : 'Sold out'}
                  </span>
                )}
              </div>
            </div>
            {prices.length > 0 && (
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Low</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatPrice(minPrice)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avg</div>
                  <div style={{ fontWeight: 600 }}>{formatPrice(avgPrice?.toFixed(2))}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>High</div>
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatPrice(maxPrice)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Snapshots</div>
                  <div style={{ fontWeight: 600 }}>{history.length}</div>
                </div>
              </div>
            )}
          </div>
          {lp && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              Last updated: {formatTime(lp.scraped_at)}
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'chart' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          📈 Price History
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'logs' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Scrape Logs
        </button>
      </div>

      {/* Chart Tab */}
      {activeTab === 'chart' && (
        <>
          {chartData.length === 0 ? (
            <div className="empty-state">
              <p>No price history yet. Run a scrape to collect data.</p>
            </div>
          ) : (
            <>
              <div className="chart-section">
                <h2>Price Over Time</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e4e4e7' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `₹${v.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                        }}
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Price']}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#18181b"
                        strokeWidth={2}
                        dot={{ fill: '#18181b', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-section">
                <h2>Stock Over Time</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e4e4e7' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="stock" fill="#16a34a" name="Stock" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="chart-section">
          <h2>Scrape Logs</h2>
          {logs.length === 0 ? (
            <div className="empty-state">
              <p>No scrape logs yet.</p>
            </div>
          ) : (
            <div className="log-table-container">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Attempt</th>
                    <th>Outcome</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Duration</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{formatTime(log.attempted_at)}</td>
                      <td>{log.attempt_number}</td>
                      <td>
                        <span className={`badge ${
                          log.outcome === 'success' ? 'badge-success' :
                          log.outcome === 'failed' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td>{log.outcome === 'success' ? formatPrice(log.price) : '—'}</td>
                      <td>{log.outcome === 'success' ? log.stock : '—'}</td>
                      <td>{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductDetails;
