
'use strict';

const store = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storeOTP(email, otp) {
  store.set(email, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
}

function verifyOTP(email, code) {
  // 1. OTP not found
  if (!store.has(email)) {
    return { ok: false, reason: 'not_found' };
  }

  const entry = store.get(email);

  // 2. OTP expired
  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return { ok: false, reason: 'expired' };
  }

  // 3. Maximum attempts reached
  if (entry.attempts >= 3) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  // 4. Incorrect OTP
  if (entry.otp !== code) {
    entry.attempts++;
    return { ok: false, reason: 'wrong_code' };
  }

  // 5. Correct OTP: make it single-use
  store.delete(email);
  return { ok: true };
}

function markVerified(email) {
  console.log('Email verified: ' + email);
}

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  markVerified,
  _store: store,
};
