
const sessionStore = require('../session/sessionStore');

module.exports = function requireSession(req, res, next) {
  // TODO: read req.signedCookies.sid, resolve the server session,
  // attach identity to the request, and return generic 401 when invalid.
  const sid = req.signedCookies?.sid;

  if (typeof sid !== 'string' || !sid) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const session = sessionStore.get(sid);

  if (!session) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  req.user = { id: session.userId };
  req.session = session;

  return next();
};
