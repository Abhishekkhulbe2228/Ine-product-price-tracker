import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts, getProductDetails, trackProduct } from '../services/api';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  // Selected product for option picking
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [tracking, setTracking] = useState(false);
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      setSelectedProduct(null);
      setProductDetails(null);
      const data = await searchProducts(query);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectProduct(product) {
    try {
      setSelectedProduct(product);
      setLoadingDetails(true);
      setSelectedOption(null);
      const details = await getProductDetails(product.id);
      setProductDetails(details);
      // Auto-select first option
      if (details.options && details.options.length > 0) {
        setSelectedOption(details.options[0]);
      }
    } catch (err) {
      setError(`Failed to load product details: ${err.message}`);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleTrack() {
    if (!selectedProduct || !selectedOption) return;

    try {
      setTracking(true);
      await trackProduct({
        storeProductId: selectedProduct.id,
        productName: selectedProduct.name,
        optionAxis: productDetails?.optionAxis || null,
        selectedOptionId: selectedOption.id,
        selectedOptionLabel: selectedOption.label,
      });
      alert(`Now tracking "${selectedProduct.name}" (${selectedOption.label})`);
      navigate('/');
    } catch (err) {
      alert(`Failed to track: ${err.message}`);
    } finally {
      setTracking(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Search Products</h1>
        <p>Search the INE store catalog to find products to track</p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="Search by name, brand, or category..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </form>

      {error && (
        <div className="error-state" style={{ padding: '1rem' }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Searching store catalog...</p>
        </div>
      )}

      {/* Option selection modal/section */}
      {selectedProduct && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--border-strong)' }}>
          <div className="card-body">
            <div className="product-category">{selectedProduct.category}</div>
            <div className="product-name" style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
              {selectedProduct.name}
            </div>
            <div className="product-brand">{selectedProduct.brand}</div>
            <div className="product-sku">{selectedProduct.sku}</div>

            {loadingDetails ? (
              <div style={{ padding: '1rem 0' }}>
                <div className="spinner" />
                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  Loading options...
                </p>
              </div>
            ) : productDetails && (
              <>
                {productDetails.options && productDetails.options.length > 0 && (
                  <div className="option-group">
                    <div className="option-label">
                      {productDetails.optionAxis || 'Option'}: Select one to track
                    </div>
                    <div className="option-chips">
                      {productDetails.options.map(opt => (
                        <button
                          key={opt.id}
                          className={`option-chip ${selectedOption?.id === opt.id ? 'selected' : ''}`}
                          onClick={() => setSelectedOption(opt)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    id="btn-track"
                    className="btn btn-primary"
                    onClick={handleTrack}
                    disabled={!selectedOption || tracking}
                  >
                    {tracking ? 'Tracking...' : `Track ${selectedOption?.label || ''}`}
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setSelectedProduct(null); setProductDetails(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search results */}
      {!loading && searched && (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>

          {results.length === 0 ? (
            <div className="empty-state">
              <p>No products found. Try a different search term.</p>
            </div>
          ) : (
            <div className="product-grid">
              {results.map(product => (
                <div key={product.id} className="card product-card">
                  <div className="card-body">
                    <div className="product-category">{product.category}</div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-brand">{product.brand}</div>
                    <div className="product-sku">{product.sku}</div>
                  </div>
                  <div className="product-card-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSelectProduct(product)}
                      style={{ width: '100%' }}
                    >
                      Select & Track
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !searched && (
        <div className="empty-state">
          <p>Type a product name, brand, or category to search the INE store catalog.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            960 products available across categories like Office, Cameras, Audio, and more.
          </p>
        </div>
      )}
    </div>
  );
}

export default Search;
