const router = require('express').Router();
const db = require('../db');
const avatar = require('../lib/avatar');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

router.post('/avatar', (req, res) => {
  try { avatar.save(req.user.id, req.body.image); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  db.update('users', req.user.id, { avatarVersion: Date.now() });
  res.json({ avatarUrl: avatar.avatarUrl(req.user) });
});

router.delete('/avatar', (req, res) => {
  avatar.remove(req.user.id);
  db.update('users', req.user.id, { avatarVersion: null });
  res.json({ ok: true });
});

// Any signed-in user can see anyone's photo (it appears next to their chat messages and posts).
router.get('/avatar/:id', (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(404).end();
  const u = db.find('users', (x) => x.id === req.params.id);
  if (!u || !u.avatarVersion) return res.status(404).end();
  res.set({
    'Content-Type': 'image/jpeg',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'sandbox',
    'Cache-Control': 'private, max-age=86400',
  });
  res.sendFile(avatar.fileFor(u.id), { dotfiles: 'allow' }, (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

module.exports = router;
