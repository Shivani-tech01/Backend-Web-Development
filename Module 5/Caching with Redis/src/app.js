
'use strict';

// GIVEN FILE — add caching

require('dotenv').config();

const express = require('express');
const db = require('./db');

// Import cache functions
const { cacheGet, cacheSet, cacheDel } = require('./cache');

const app = express();
app.use(express.json());

const FEED_KEY = 'feed:trending';
const FEED_TTL = 60; // seconds

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /feed — Cache-aside strategy
app.get('/feed', async (req, res) => {
  try {
    // 1. Check cache first
    const cachedPosts = await cacheGet(FEED_KEY);

    // 2. If cache HIT
    if (cachedPosts !== null && cachedPosts !== undefined) {
      res.set('X-Cache', 'HIT');
      console.log('[feed] Cache HIT');
      return res.json(cachedPosts);
    }

    // 3. If cache MISS, query database
    console.log('[feed] Cache MISS');

    const t0 = Date.now();
    const posts = await db.getTrendingPosts();

    console.log(`[feed] DB ${Date.now() - t0}ms`);

    // 4. Store database result in cache for 60 seconds
    await cacheSet(FEED_KEY, posts, FEED_TTL);

    // 5. Set response header
    res.set('X-Cache', 'MISS');

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

    // Invalidate feed cache after creating a post
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
