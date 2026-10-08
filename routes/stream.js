const router = require('express').Router();
const db = require('../db');
const { requireLogin, requireTeacher } = require('../middleware/auth');

router.use(requireLogin);

router.get('/', (req, res) => {
  const users = db.all('users');
  const list = db.all('announcements')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) => ({ ...a, authorName: (users.find((u) => u.id === a.authorId) || {}).name || 'Teacher' }));
  res.json(list);
});

router.post('/', requireTeacher, (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 3000);
  if (!text) return res.status(400).json({ error: 'Write something to announce.' });
  res.json(db.insert('announcements', { authorId: req.user.id, text }));
});

router.delete('/:id', requireTeacher, (req, res) => {
  db.remove('announcements', (a) => a.id === req.params.id);
  res.json({ ok: true });
});

module.exports = router;
