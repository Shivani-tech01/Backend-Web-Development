
const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const sessionStore = require('../session/sessionStore');

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  signed: true,
  path: '/',
};

const sessionCookieOptions = {
  ...cookieOptions,
  maxAge: 60 * 60 * 1000,
};

router.post('/login', async (req, res, next) => {
  // TODO: validate credentials, create a server session, and set signed `sid` cookie.
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const { sessionId } = sessionStore.create(user.id);

    res.cookie('sid', sessionId, sessionCookieOptions);

    return res.status(200).json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', async (req, res, next) => {
  // TODO: resolve signed cookie through the server-side session store.
  try {
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

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      sessionStore.destroy(sid);

      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res, next) => {
  // TODO: destroy server session and clear cookie using matching options.
  try {
    const sid = req.signedCookies?.sid;

    if (typeof sid === 'string' && sid) {
      sessionStore.destroy(sid);
    }

    res.clearCookie('sid', cookieOptions);

    return res.status(200).json({
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
