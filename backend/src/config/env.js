import dotenv from 'dotenv';
dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cronSecret: process.env.CRON_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mockStoreUrl: process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com',
  scrapeTimeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryBackoffBaseMs: parseInt(process.env.RETRY_BACKOFF_BASE_MS || '2000', 10),
};

// Validate required environment variables at startup
const required = ['supabaseUrl', 'supabaseServiceRoleKey', 'cronSecret'];
for (const key of required) {
  if (!env[key]) {
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export default env;
