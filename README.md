# INE Product Price Tracker

A full-stack web application that tracks product prices and stock levels from the [INE mock storefront](https://demo.inelabteamdev.com/).

Built for the INE Software Engineer Intern Assignment.

## Architecture

```
Frontend (React + Vite)  →  Backend (Express + Node.js)  →  Supabase (PostgreSQL)
                                     ↓
                              Playwright (Chromium)
                                     ↓
                         INE Mock Store (demo.inelabteamdev.com)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, React Router |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Scraper | Playwright (Chromium) |
| Scheduler | cron-job.org |
| Deployment | Vercel (frontend), Render (backend) |

## Features

- **Product Search**: Search 960 products by name, brand, or category
- **Price Tracking**: Track any product + option variant
- **Automated Scraping**: Scheduled via cron-job.org (every 2 hours)
- **Manual Scraping**: Trigger from dashboard or CLI
- **Price History Charts**: Visualize price and stock trends over time
- **Scrape Logs**: Full audit trail of every scrape attempt (success/retry/fail)
- **CSV Export**: Download complete scrape history
- **Headed Mode**: Run scraper with visible browser for demonstration
- **Retry Logic**: 3 attempts with exponential backoff to handle 35% failure injection

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com/))

### 1. Clone & Install

```bash
git clone <repo-url>
cd ine-price-tracker

# Backend
cd backend
npm install
npx playwright install chromium

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

1. Go to your Supabase project → SQL Editor
2. Run the contents of `database/schema.sql`

### 3. Configure Environment

```bash
# backend/.env
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials and a cron secret
```

Required variables:
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (found in Settings → API)
- `CRON_SECRET` — Any random string for authenticating cron requests

### 4. Run Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/health

## Usage

### Search & Track Products

1. Navigate to **Search & Track** page
2. Search for a product (e.g., "desk chair", "camera", "headphones")
3. Select a product → Choose an option variant → Click **Track**

### Run Scraper

**From Dashboard:**
Click the "Run Scrape Now" button

**From CLI (headless):**
```bash
cd backend
npm run scrape:manual
```

**From CLI (headed / visible browser):**
```bash
cd backend
npm run scrape:headed
```

### Export Data

Click "Export CSV" on the dashboard to download all scrape history.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products/search?q=query` | Search store products |
| `GET` | `/api/products/:id` | Get product details + options |
| `POST` | `/api/tracked-products` | Track a product+option |
| `GET` | `/api/tracked-products` | List tracked products |
| `GET` | `/api/tracked-products/:id` | Get tracked product |
| `DELETE` | `/api/tracked-products/:id` | Stop tracking |
| `GET` | `/api/tracked-products/:id/history` | Price history |
| `GET` | `/api/tracked-products/:id/logs` | Scrape logs |
| `POST` | `/api/scrape/run` | Cron scrape (auth required) |
| `POST` | `/api/scrape/manual` | Manual scrape trigger |
| `GET` | `/api/export` | CSV download |
| `GET` | `/health` | Health check |

## Deployment

### Backend (Render)

1. Push to GitHub
2. Create a new Web Service on [render.com](https://render.com/)
3. Set root directory: `backend`
4. Build command: `npm install && npx playwright install chromium --with-deps`
5. Start command: `npm start`
6. Add environment variables from `.env.example`

### Frontend (Vercel)

1. Import project on [vercel.com](https://vercel.com/)
2. Set root directory: `frontend`
3. Set environment variable: `VITE_API_BASE_URL=https://your-render-app.onrender.com`

### Scheduled Scraping (cron-job.org)

1. Create account at [cron-job.org](https://cron-job.org/)
2. Create a new cron job:
   - URL: `https://your-render-app.onrender.com/api/scrape/run`
   - Schedule: Every 2 hours
   - Method: POST
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

## Project Structure

```
├── frontend/         React + Vite frontend
│   └── src/
│       ├── pages/    Dashboard, Search, ProductDetails
│       ├── services/ API client
│       └── App.jsx   Main app with router
├── backend/          Express + Playwright backend
│   └── src/
│       ├── config/   Environment config
│       ├── controllers/  Request handlers
│       ├── db/       Supabase client
│       ├── middleware/   Auth, error handling
│       ├── routes/   Express routes
│       ├── scraper/  Browser, selectors, validator, retry
│       ├── scripts/  CLI scrape commands
│       ├── services/ Business logic
│       └── server.js Entry point
├── database/         SQL schema
├── DESIGN_NOTE.md    Scraping approach & AI usage
└── README.md         This file
```

## Design Decisions

See [DESIGN_NOTE.md](./DESIGN_NOTE.md) for detailed documentation of:
- Why Playwright is required (not HTTP-only)
- How CSS selectors were discovered
- How the store's anti-scraping measures are handled
- Database schema rationale
- AI tool usage disclosure
