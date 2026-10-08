const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

const clean = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const text = (v, max) => String(v || '').trim().slice(0, max);

router.post('/login', async (req, res) => {
  const email = text(req.body.email, 200).toLowerCase();
  const user = db.find('users', (u) => u.email === email);
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
  if (!ok) return res.status(400).json({ error: 'Incorrect email or password.' });
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not sign in.' });
    req.session.userId = user.id;
    res.json({ user: clean(user) });
  });
});

router.post('/register', async (req, res) => {
  const name = text(req.body.name, 80);
  const email = text(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.find('users', (u) => u.email === email))
    return res.status(400).json({ error: 'An account with that email already exists.' });

  const code = process.env.TEACHER_CODE;
  const role = code && req.body.teacherCode && req.body.teacherCode === code ? 'teacher' : 'student';
  if (req.body.teacherCode && role !== 'teacher')
    return res.status(400).json({ error: 'That teacher code is not correct.' });

  const user = db.insert('users', { name, email, role, passwordHash: await bcrypt.hash(password, 10) });
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
