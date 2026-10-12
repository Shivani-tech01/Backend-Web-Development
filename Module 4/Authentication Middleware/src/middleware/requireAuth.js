
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  // 1. Read the Authorization header safely
  const authorization = req.headers.authorization ?? '';

  // 2. Extract the Bearer token using the strict regex
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  const token = match ? match[1] : null;

  // 3. Return 401 if the token is missing or malformed
  if (token === null) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  // 4. Verify the token
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    // Attach the verified payload to the request
    req.user = payload;

    // Continue to the next middleware
    return next();
  } catch (error) {
    // 5. Return the same generic error for every verification failure
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }
};
