function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error, attempt, attempts) {
  if (attempt >= attempts) {
    return false;
  }

  if (!error) {
    return false;
  }

  if (error.name === "AbortError") {
    return true;
  }

  const status = Number(error.statusCode || error.status || 0);
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function withRetry(task, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 1));
  const minDelayMs = Math.max(0, Number(options.minDelayMs || 250));
  const maxDelayMs = Math.max(minDelayMs, Number(options.maxDelayMs || 2000));
  const shouldRetry = typeof options.shouldRetry === "function" ? options.shouldRetry : defaultShouldRetry;

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error, attempt, attempts)) {
        throw error;
      }

      const exponentialDelay = minDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * minDelayMs);
      const waitFor = Math.min(maxDelayMs, exponentialDelay + jitter);
      await sleep(waitFor);
    }
  }

  throw lastError;
}

module.exports = { withRetry };
