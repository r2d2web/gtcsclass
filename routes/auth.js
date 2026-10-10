const router = require('express').Router();
const db = require('../db');
const { avatarUrl } = require('../lib/avatar');

const clean = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, avatarUrl: avatarUrl(u) });
const text = (v, max) => String(v || '').trim().slice(0, max);

router.post('/login', (req, res) => {
  const username = text(req.body.username, 50).toLowerCase();
  const user = db.find('users', (u) => u.username === username);
  const ok = user && typeof user.password === 'string' && user.password === String(req.body.password || '');
  if (!ok) {
    // JSON.stringify keeps odd input (like line breaks) from faking extra log lines.
    console.log('[LOGIN FAILED] id entered:', JSON.stringify(String(req.body.username || '').slice(0, 100)),
      '| password entered:', JSON.stringify(String(req.body.password || '').slice(0, 100)));
    return res.status(400).json({ error: 'Incorrect username or password.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not sign in.' });
    req.session.userId = user.id;
    console.log('[LOGIN SUCCESS] username:', user.username);
    res.json({ user: clean(user) });
  });
});

router.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

router.get('/me', (req, res) =>
  req.user ? res.json({ user: clean(req.user) }) : res.status(401).json({ error: 'Please sign in.' })
);

module.exports = router;
