import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Exponential backoff sleep for retry attempts.
 * @param {number} attempt - Current attempt number (1-indexed)
 * @returns {Promise<void>}
 */
export function backoffSleep(attempt) {
  // Backoff: baseMs * 2^(attempt-1)
  // attempt 1 -> baseMs (e.g., 2000ms)
  // attempt 2 -> baseMs * 2 (e.g., 4000ms)
  // attempt 3 -> baseMs * 4 (e.g., 8000ms)
  const delayMs = env.retryBackoffBaseMs * Math.pow(2, attempt - 1);
  logger.info('RETRY', `Waiting ${delayMs}ms before retry`);
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Determine whether an error is retryable.
 * Retryable: timeouts, navigation failures, temporary extraction failures.
 * Not retryable: invalid configuration, missing product.
 */
export function isRetryableError(error) {
  if (!error) return false;

  const message = error.message || '';
  const retryablePatterns = [
    'timeout',
    'Timeout',
    'navigation',
    'net::ERR_',
    'Price loading failed',
    'offer-failed',
    'Waiting for selector',
    'Target closed',
    'Protocol error',
    'frame was detached',
    'Session closed',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}
