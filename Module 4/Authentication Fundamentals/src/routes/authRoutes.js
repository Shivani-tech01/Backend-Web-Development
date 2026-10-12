const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

const router = express.Router();

// Return only public user information.
// Never send the password or password hash to the client.
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    // Validate the input.
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message:
            'Valid name, email, and password of at least 8 characters are required',
        },
      });
    }

    // Normalize the email before saving it.
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the email is already registered.
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    // Hash the password before storing it.
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_COST) || 12
    );

    // Create the user using the field name from schema.prisma.
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
      },
    });

    return res.status(201).json({
      data: publicUser(user),
    });
  } catch (error) {
    // Handle duplicate email errors from Prisma.
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    return next(error);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    // Validate the input.
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

    const normalizedEmail = email.trim().toLowerCase();

    // Find the user by email.
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Use the same response for an unknown email and a wrong password.
    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Ensure the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Create a signed JWT that expires after one hour.
    const token = jwt.sign(
      {
        sub: String(user.id),
      },
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '1h',
      }
    );

    return res.status(200).json({
      data: {
        user: publicUser(user),
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;