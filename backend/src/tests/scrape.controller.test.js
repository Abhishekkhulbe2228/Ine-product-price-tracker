import { jest } from '@jest/globals';

jest.unstable_mockModule('../services/scraper.service.js', () => ({
  runScraper: jest.fn().mockImplementation(() => new Promise(() => {})), // never resolves in test
}));

const { cronScrapeHandler } = await import('../controllers/scrape.controller.js');
const { runScraper } = await import('../services/scraper.service.js');

describe('Scrape Controller', () => {
  describe('cronScrapeHandler', () => {
    it('should return HTTP 202 immediately without awaiting runScraper', async () => {
      const req = {};
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
      const next = jest.fn();

      const startTime = Date.now();
      await cronScrapeHandler(req, res, next);
      const elapsed = Date.now() - startTime;

      // Assert runScraper was called with 'cron'
      expect(runScraper).toHaveBeenCalledWith('cron');

      // Assert immediate response (sub-50ms)
      expect(elapsed).toBeLessThan(100);

      // Assert HTTP 202 and correct payload
      expect(res.statusCode).toBe(202);
      expect(res.body).toEqual({
        success: true,
        message: 'Scrape run accepted and started in background',
        status: 'accepted',
        trigger: 'cron',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
