
'use strict';
// routes/payments.js

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  // Rule 1: Require an Idempotency-Key header
  const key = req.headers['idempotency-key'];

  if (!key || !key.trim()) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'The Idempotency-Key header is required.'
      }
    });
  }

  // Rule 2: If this key was already processed, replay its response
  if (idempotency.has(key)) {
    const storedResponse = idempotency.get(key);

    return res.status(storedResponse.status).json(storedResponse.body);
  }

  // Rule 3: Process a new key and create exactly one charge
  const amount = req.body && req.body.amount;

  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged'
  };

  charges.push(charge);

  const responseBody = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status
  };

  // Store the original HTTP status and response body
  idempotency.set(key, {
    status: 201,
    body: responseBody
  });

  return res.status(201).json(responseBody);
});

module.exports = router;
