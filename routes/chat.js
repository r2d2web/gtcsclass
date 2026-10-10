const router = require('express').Router();
const db = require('../db');
const { avatarUrl } = require('../lib/avatar');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

// Last 100 messages; live messages arrive over Socket.IO (see server.js).
router.get('/', (req, res) => {
  const users = db.all('users');
  res.json(
    db.all('messages').slice(-100).map((m) => {
      const u = users.find((x) => x.id === m.userId) || {};
      return { ...m, name: u.name || 'Former member', role: u.role || 'student', avatarUrl: avatarUrl(u) };
    })
  );
});

module.exports = router;
