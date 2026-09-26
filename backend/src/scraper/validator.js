/**
 * Validation functions for scraped data.
 * 
 * A scrape is only considered successful when ALL validations pass.
 * Invalid data must NEVER be stored in price_history.
 */

/**
 * Parse a currency string like "₹1,299" or "₹12,499.50" into a number.
 * Returns null if the value cannot be parsed or is invalid.
 */
export function parsePrice(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Remove zero-width spaces (\u200B-\u200D, \uFEFF), currency symbols, commas, whitespace
  const sanitized = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const cleaned = sanitized.replace(/[₹$€£,\s]/g, '').trim();

  if (!cleaned) return null;

  const price = parseFloat(cleaned);

  if (isNaN(price) || !isFinite(price)) return null;
  if (price <= 0) return null;
  if (price > 10_000_000) return null; // sanity upper bound

  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

/**
 * Parse stock text into an integer.
 * The INE store uses various templates:
 *   "42 units available"
 *   "Last few: 3"
 *   "Available (15)"
 *   "Stock: 8 remaining"
 *   "Ready to ship – 25 available"
 *   "Sold out"
 * 
 * Returns null if the value cannot be parsed.
 */
export function parseStock(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const sanitized = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const trimmed = sanitized.trim();

  // Check for "Sold out" first
  if (/sold\s*out/i.test(trimmed)) return 0;

  // Extract any number from the text
  const match = trimmed.match(/(\d+)/);
  if (!match) return null;

  const stock = parseInt(match[1], 10);

  if (isNaN(stock) || stock < 0) return null;
  if (stock > 1_000_000) return null; // sanity upper bound

  return stock;
}

/**
 * Validate that we're on the correct product page.
 * Compares the page title against the expected product name.
 */
export function validateProductIdentity(pageTitle, expectedName) {
  if (!pageTitle || !expectedName) return false;

  const normalizedPage = pageTitle.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const normalizedExpected = expectedName.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();

  return normalizedPage.includes(normalizedExpected) ||
         normalizedExpected.includes(normalizedPage);
}

/**
 * Validate that the correct option is selected.
 * Compares the selected option text against the expected label.
 */
export function validateSelectedOption(selectedText, expectedLabel) {
  if (!selectedText || !expectedLabel) return false;

  const normSelected = selectedText.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const normExpected = expectedLabel.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();

  return normSelected === normExpected;
}

/**
 * Full validation of a scraped result.
 * Returns { valid: true, price, stock } or { valid: false, reason }.
 */
export function validateScrapeResult({ rawPrice, rawStock, pageTitle, expectedName, selectedOptionText, expectedOptionLabel }) {
  // 1. Validate product identity
  if (!validateProductIdentity(pageTitle, expectedName)) {
    return { valid: false, reason: 'Product identity mismatch' };
  }

  // 2. Validate selected option
  if (!validateSelectedOption(selectedOptionText, expectedOptionLabel)) {
    return { valid: false, reason: `Option mismatch: got "${selectedOptionText}", expected "${expectedOptionLabel}"` };
  }

  // 3. Parse and validate price
  const price = parsePrice(rawPrice);
  if (price === null) {
    return { valid: false, reason: `Invalid price value: "${rawPrice}"` };
  }

  // 4. Parse and validate stock
  const stock = parseStock(rawStock);
  if (stock === null) {
    return { valid: false, reason: `Invalid stock value: "${rawStock}"` };
  }

  return { valid: true, price, stock };
}
