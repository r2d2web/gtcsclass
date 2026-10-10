const router = require('express').Router();
const db = require('../db');
const { avatarUrl } = require('../lib/avatar');

const clean = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, avatarUrl: avatarUrl(u) });
const text = (v, max) => String(v || '').trim().slice(0, max);
const USERNAME = /^[a-z0-9._-]{3,20}$/; // usernames are stored in lowercase

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

router.post('/register', (req, res) => {
  const name = text(req.body.name, 80);
  const username = text(req.body.username, 50).toLowerCase();
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!USERNAME.test(username))
    return res.status(400).json({ error: 'Username must be 3 to 20 characters: letters, numbers, dots, dashes or underscores.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.find('users', (u) => u.username === username))
    return res.status(400).json({ error: 'That username is already taken.' });

  // Sign-ups are always students. Teacher accounts are added to data/users.json by hand.
  const user = db.insert('users', { name, username, role: 'student', password });
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not sign in.' });
    req.session.userId = user.id;
    res.json({ user: clean(user) });
  });
});

router.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

router.get('/me', (req, res) =>
  req.user ? res.json({ user: clean(req.user) }) : res.status(401).json({ error: 'Please sign in.' })
);

module.exports = router;
