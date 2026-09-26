/**
 * CSS selectors for the INE mock store.
 * 
 * These were identified by inspecting the actual rendered DOM at
 * https://demo.inelabteamdev.com/ and the JS/CSS bundles.
 * 
 * Selectors are grouped by page area and ordered by stability.
 * Prefer semantic class-based selectors over positional nth-child selectors.
 */

const SELECTORS = {
  // Product detail page
  productTitle: '.pdp-summary h1',
  productBrand: '.pdp-maker',
  productCategory: '.dept-label',

  // Option selection
  optionAxis: '.opt-axis',
  optionChip: '.opt-chip',
  optionChipSelected: '.opt-chip-on',
  // Build a selector for a specific option by label:
  // `.opt-chip:has-text("Oak")`

  // Price loading trigger
  checkPriceButton: '.offer-panel button.ctl-main, button[aria-label="Check today’s price"]',

  // Cookie / Consent modal
  consentScrim: '.consent-scrim',
  consentAllowButton: '.consent-box button, button[aria-label="Allow cookies"]',

  // Price panel states
  offerPanel: '.offer-panel',
  offerReady: '.offer-ready',
  offerFailed: '.offer-failed',
  offerLocked: '.offer-locked',
  offerLoading: '.offer-panel .loader',

  // Price extraction (hidden spans with actual numeric values)
  priceValue: '.price-value',
  priceDataSpan: 'span[data-price="true"]',
  amountSpan: '.amount',

  // Stock
  stockPill: '.avail-pill',
  stockInStock: '.avail-yes',
  stockSoldOut: '.avail-no',

  // Status messages
  offerMessage: '.offer-msg',
  offerSubmessage: '.offer-submsg',

  // Page navigation
  pager: '.pager',
  retryButton: '.offer-failed .ctl-main',
};

export default SELECTORS;
