import {
  parsePrice,
  parseStock,
  validateProductIdentity,
  validateSelectedOption,
  validateScrapeResult,
} from '../scraper/validator.js';

describe('Validator Utility', () => {
  describe('parsePrice', () => {
    it('should parse currency formatted price strings correctly', () => {
      expect(parsePrice('₹1,299')).toBe(1299);
      expect(parsePrice('₹12,499.50')).toBe(12499.5);
      expect(parsePrice('$99.99')).toBe(99.99);
    });

    it('should return null for invalid or negative prices', () => {
      expect(parsePrice(null)).toBeNull();
      expect(parsePrice('')).toBeNull();
      expect(parsePrice('invalid')).toBeNull();
      expect(parsePrice('-₹500')).toBeNull();
    });
  });

  describe('parseStock', () => {
    it('should parse stock text formats accurately', () => {
      expect(parseStock('42 units available')).toBe(42);
      expect(parseStock('Last few: 3')).toBe(3);
      expect(parseStock('Available (15)')).toBe(15);
      expect(parseStock('Sold out')).toBe(0);
    });

    it('should return null for unparseable stock text', () => {
      expect(parseStock(null)).toBeNull();
      expect(parseStock('No numbers here')).toBeNull();
    });
  });

  describe('validateProductIdentity', () => {
    it('should match page title with product name case-insensitively', () => {
      expect(validateProductIdentity('Classic Leather Jacket - INE Store', 'Classic Leather Jacket')).toBe(true);
      expect(validateProductIdentity('Wrong Product Name', 'Classic Leather Jacket')).toBe(false);
    });
  });

  describe('validateScrapeResult', () => {
    it('should pass valid scrape outputs', () => {
      const result = validateScrapeResult({
        rawPrice: '₹2,499.00',
        rawStock: '12 available',
        pageTitle: 'Denim Jacket',
        expectedName: 'Denim Jacket',
        selectedOptionText: 'Size: M',
        expectedOptionLabel: 'Size: M',
      });
      expect(result.valid).toBe(true);
      expect(result.price).toBe(2499);
      expect(result.stock).toBe(12);
    });

    it('should reject mismatched options', () => {
      const result = validateScrapeResult({
        rawPrice: '₹2,499.00',
        rawStock: '12 available',
        pageTitle: 'Denim Jacket',
        expectedName: 'Denim Jacket',
        selectedOptionText: 'Size: S',
        expectedOptionLabel: 'Size: M',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Option mismatch');
    });
  });
});
