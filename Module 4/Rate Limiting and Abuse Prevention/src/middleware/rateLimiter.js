
'use strict';
// middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  // In a multi-instance deployment, each server's default in-memory store
  // maintains separate rate-limit counters. Behind a load balancer, requests
  // may reach different instances, allowing a client to exceed the intended
  // limit because each instance tracks only its own requests. Using
  // rate-limit-redis with a shared Redis store lets all instances read and
  // update the same counters, enforcing a consistent limit across servers.
});
