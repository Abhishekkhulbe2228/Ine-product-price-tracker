# DESIGN_NOTE.md — INE Product Price Tracker

## Scraping Approach

### Why Playwright (Not HTTP-Only Scraping)?

The INE mock store at `https://demo.inelabteamdev.com/` is a **React 19 Single Page Application**. All HTML served is an empty `<div id="root"></div>` — no product data exists in the initial HTML response.

Furthermore, pricing and stock data use a **multi-step encryption mechanism**:

1. A **WebAssembly proof-of-work** nonce must be computed client-side
2. The nonce is sent via `POST /api/v2/handshake` to obtain a bearer token
3. The bearer token is used to `GET /api/v2/items/{id}/quote?opt={optId}`
4. The response is **XOR-encrypted** and must be decrypted using a key derived from the bearer token

This makes it impractical to extract pricing via HTTP requests alone — the WebAssembly PoW computation and XOR decryption would require reimplementing the store's entire crypto pipeline. Using Playwright lets the browser handle all of this natively.

### Hybrid Strategy

| Data Type | Method | Rationale |
|-----------|--------|-----------|
| Product catalog (name, brand, SKU, options) | HTTP `fetch()` to `/api/v2/listings` and `/api/v2/items/{id}` | These APIs return plain JSON with no auth required |
| Price and stock | Playwright browser automation | Requires WebAssembly PoW + encrypted response decryption |

### How I Discovered This

1. Fetched the homepage HTML → confirmed it's an empty SPA shell
2. Downloaded and analyzed the JS bundle (`/assets/index-GaW5Fnef.js`, 288KB)
3. Searched for `fetch(`, `/api/`, `price`, `quote` patterns in the bundle
4. Found three open JSON APIs: `/api/v2/listings`, `/api/v2/items/{id}`, `/api/v2/ui/manifest`
5. Found two protected APIs: `/api/v2/handshake` (POST) and `/api/v2/items/{id}/quote` (GET with Bearer token)
6. Decoded the obfuscated string table used by the minified bundle to reconstruct the actual endpoint paths
7. Verified by calling the endpoints directly — open APIs returned JSON, protected APIs returned 401
8. Identified the XOR decryption logic and WebAssembly-based proof-of-work in the bundle
9. Discovered the 35% deliberate failure injection function (`Math.random() < 0.35`)

### Built-in Anti-Scraping Measures

The store implements deliberate challenges to test scraper resilience:

- **35% click failure rate**: Button clicks are randomly dropped (~17.5%) or delayed by 900ms (~17.5%)
- **WebAssembly proof-of-work**: Pricing requires computational work before the server responds
- **Encrypted pricing**: Price data is XOR-encrypted in transit and must be decrypted client-side
- **Randomized catalog order**: The `/api/v2/listings` endpoint returns products in random order on every call

### How the Scraper Handles These

- **Retry logic**: 3 attempts per product with exponential backoff (2s, 4s, 8s)
- **Every attempt logged**: `scrape_logs` table records success, retried, and failed outcomes
- **Validation before save**: Price must be positive, stock must be non-negative, product identity must match
- **Browser-native PoW**: Playwright executes the store's own JavaScript, so the WebAssembly PoW runs naturally
- **Catalog caching**: All 960 products fetched once and cached in memory for 5 minutes to work around randomized order

## CSS Selectors

All selectors were identified by inspecting the store's CSS bundle (`/assets/index-a0Mp7OCs.css`) and the rendered DOM. Key selectors used:

| Selector | Purpose |
|----------|---------|
| `.pdp-summary h1` | Product name on detail page |
| `.opt-chip` | Option selection buttons |
| `.opt-chip-on` | Currently selected option |
| `.ctl-main` | "Check today's price" button |
| `.offer-ready` | Price loaded successfully |
| `.offer-failed` | Price loading failed |
| `.price-value` | Hidden span with price |
| `.avail-pill` | Stock status display |
| `.avail-yes` / `.avail-no` | In stock / Sold out |

## Database Design

Four tables with clear separation of concerns:

- `tracked_products` — what the user wants to monitor
- `price_history` — only successful price+stock snapshots (clean data)
- `scrape_logs` — every attempt including failures (for debugging/auditing)
- `scrape_runs` — metadata about each full scrape execution

This separation ensures `price_history` always contains valid, verified data while `scrape_logs` captures the complete audit trail.

## AI Tool Usage

AI tools (GitHub Copilot, Claude) were used as an implementation aid for:

- Generating boilerplate Express routes and middleware
- Scaffolding React components and CSS
- Writing documentation and comments

All generated code was reviewed, understood, and modified to fit the specific requirements of this project. Every line of code is defensible and explainable. The architectural decisions, scraping approach, selector choices, and database design were all determined through manual analysis of the INE mock store.

No code was copy-pasted blindly. The scraper selectors, API endpoints, and pricing mechanism were all discovered through first-principles inspection of the actual website.
