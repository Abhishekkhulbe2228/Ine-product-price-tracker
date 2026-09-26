import supabase from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * Generate CSV export of all scrape history.
 * Includes one row per scrape attempt (success, retried, failed).
 * Failed rows have empty price and stock.
 */
export async function generateCsvExport() {
  // Join scrape_logs with tracked_products for full context
  const { data, error } = await supabase
    .from('scrape_logs')
    .select(`
      *,
      tracked_products (
        store_product_id,
        product_name,
        selected_option_label
      )
    `)
    .order('attempted_at', { ascending: true });

  if (error) {
    logger.error('EXPORT', `Failed to fetch export data: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  const rows = data || [];

  // CSV header
  const headers = [
    'store_product_id',
    'product_name',
    'selected_option',
    'timestamp',
    'attempt_number',
    'price',
    'stock',
    'outcome',
    'error_message',
    'duration_ms',
  ];

  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const product = row.tracked_products;
    const line = [
      escapeCsv(String(product?.store_product_id ?? '')),
      escapeCsv(product?.product_name ?? ''),
      escapeCsv(product?.selected_option_label ?? ''),
      escapeCsv(row.attempted_at),
      escapeCsv(String(row.attempt_number)),
      row.outcome === 'success' ? escapeCsv(String(row.price ?? '')) : '',
      row.outcome === 'success' ? escapeCsv(String(row.stock ?? '')) : '',
      escapeCsv(row.outcome),
      escapeCsv(row.error_message ?? ''),
      escapeCsv(String(row.duration_ms ?? '')),
    ];
    csvLines.push(line.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Escape a CSV field value.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
