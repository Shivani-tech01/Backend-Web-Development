
const sessions = new Map();

// TODO: implement create/get/destroy around an in-memory Map.
// Store opaque session id -> { userId, expiresAt }, never credentials.
// Remove expired sessions during reads.

function create(userId, ttlMs = 60 * 60 * 1000) {
  if (userId === undefined || userId === null) {
    throw new Error('userId is required');
  }

  const sessionId = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;

  sessions.set(sessionId, {
    userId,
    expiresAt,
  });

  return { sessionId, expiresAt };
}

function get(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { ...session };
}

function destroy(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) {
    return false;
  }

  return sessions.delete(sessionId);
}

module.exports = {
  create,
  get,
  destroy,
};
