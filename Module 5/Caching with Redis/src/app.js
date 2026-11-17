
'use strict';

require('dotenv').config();

const express = require('express');
const db = require('./db');

// Import Redis cache functions
const { cacheGet, cacheSet, cacheDel } = require('./cache');

const app = express();
app.use(express.json());

const FEED_KEY = 'feed:trending';
const FEED_TTL = 60; // seconds

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// GET /feed — Cache-aside with elapsed-time logging
app.get('/feed', async (req, res) => {
  const t0 = Date.now();

  try {
    // 1. Check Redis cache
    const cachedPosts = await cacheGet(FEED_KEY);

    // 2. If cache HIT
    if (cachedPosts !== null && cachedPosts !== undefined) {
      res.set('X-Cache', 'HIT');

      console.log(`[feed] HIT ${Date.now() - t0}ms`);

      return res.json(cachedPosts);
    }

    // 3. If cache MISS, query database
    const posts = await db.getTrendingPosts();

    // 4. Store posts in Redis for 60 seconds
    await cacheSet(FEED_KEY, posts, FEED_TTL);

    // 5. Set response header
    res.set('X-Cache', 'MISS');

    console.log(`[feed] MISS ${Date.now() - t0}ms`);

    return res.json(posts);

  } catch (err) {
    console.error('[feed] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts — Create post and invalidate cache
app.post('/posts', async (req, res) => {
  try {
    const post = await db.createPost(req.body);

    // Invalidate cached feed after creating a post
    await cacheDel(FEED_KEY);

    res.status(201).json(post);

  } catch (err) {
    console.error('[posts] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

module.exports = { app };
