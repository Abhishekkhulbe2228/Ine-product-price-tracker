/**
 * Structured logger utility.
 * Prefixes all log messages with a category tag for easy filtering.
 * Never logs secrets or sensitive data.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, tag, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;

  const entry = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    tag,
    message,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };

  const prefix = `[${entry.level}] [${tag}]`;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

  if (level === 'error') {
    console.error(`${prefix} ${message}${metaStr}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${metaStr}`);
  } else {
    console.log(`${prefix} ${message}${metaStr}`);
  }
}

const logger = {
  debug: (tag, msg, meta) => log('debug', tag, msg, meta),
  info: (tag, msg, meta) => log('info', tag, msg, meta),
  warn: (tag, msg, meta) => log('warn', tag, msg, meta),
  error: (tag, msg, meta) => log('error', tag, msg, meta),
};

export default logger;
