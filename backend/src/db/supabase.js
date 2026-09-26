import { createClient } from '@supabase/supabase-js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

/**
 * Verify database connectivity. Used by health check endpoints.
 */
export async function checkConnection() {
  const { error } = await supabase.from('tracked_products').select('id').limit(1);
  if (error) {
    logger.error('DB', 'Connection check failed', { error: error.message });
    return false;
  }
  return true;
}

export default supabase;
