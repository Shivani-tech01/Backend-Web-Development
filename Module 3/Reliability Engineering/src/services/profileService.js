const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  // TODO: retry transient errors only: AbortError, 429, 5xx, or network errors.
  // Never retry 4xx client errors other than 429.
  if(error?.name ==='AbortError')return true;
  if(error?.status ===undefined && error?.statusCode === undefined){
    return true;
  }
  const status = error.status || error.statusCode;
  if(status === 429)return true;
  if(status >= 500 && status<600)return true;
  return false;
}

async function withTimeout(operation, timeoutMs) {
  // TODO: create AbortController, abort after timeoutMs,
  // call operation(controller.signal), always clear timer in finally.
  const controller = new AbortController();
  const timer = setTimeout(()=> controller.abort(),timeoutMs);
  try{
    return await operation(controller.signal);
  }finally{
    clearTimeout(timer);
  }
}

async function withRetry(operation, options = {}) {
  // TODO: maxAttempts defaults to 3.
  // Run operation, retry only isRetryable errors.
  // Between attempts await sleep(baseDelayMs * 2 ** attempt).
  // Throw final error after max attempts or non-retryable error.
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt || !isRetryable(err)) {
        throw err;
      }

      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs || 200;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

 try {
    const avatar = await withRetry(
      () => withTimeout((signal) => avatarClient.getAvatar(authorId, { signal }), timeoutMs),
      { maxAttempts, baseDelayMs }
    );

    return {
      authorId,
      avatar,
      degraded: false,
    };
  } catch (error) {
    return {
      authorId,
      avatar: DEFAULT_AVATAR,
      degraded: true,
    };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};
