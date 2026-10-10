const router = require('express').Router();
const db = require('../db');
const files = require('../lib/files');
const { avatarUrl } = require('../lib/avatar');
const { requireLogin, requireTeacher } = require('../middleware/auth');

router.use(requireLogin);

router.get('/', (req, res) => {
  const users = db.all('users');
  const comments = db.all('comments');
  const list = db.all('announcements')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ likes = [], ...a }) => ({
      ...a,
      authorName: (users.find((u) => u.id === a.authorId) || {}).name || 'Teacher',
      authorAvatar: avatarUrl(users.find((u) => u.id === a.authorId)),
      likeCount: likes.length,
      liked: likes.includes(req.user.id),
      commentCount: comments.filter((c) => c.announcementId === a.id).length,
    }));
  res.json(list);
});

router.post('/', requireTeacher, (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 3000);
  const hasFiles = Array.isArray(req.body.attachments) && req.body.attachments.length > 0;
  if (!text && !hasFiles) return res.status(400).json({ error: 'Write something or attach a file.' });
  let attachments;
  try { attachments = files.saveAll(req.body.attachments); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  res.json(db.insert('announcements', { authorId: req.user.id, text, attachments, likes: [] }));
});

// Anyone signed in can open an attachment, but only files that belong to an announcement.
router.get('/files/:id', (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(404).end();
  let att = null;
  for (const a of db.all('announcements')) {
    att = (a.attachments || []).find((f) => f.id === req.params.id);
    if (att) break;
  }
  if (!att) return res.status(404).end();
  res.set({
    'Content-Type': files.TYPES[att.ext],
    'Content-Disposition': `${att.isImage ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(att.name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'sandbox',
    'Cache-Control': 'private, max-age=3600',
  });
  res.sendFile(files.pathFor(att), { dotfiles: 'allow' }, (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

// Like / unlike (toggle).
router.post('/:id/like', (req, res) => {
  const a = db.find('announcements', (x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Announcement not found.' });
  const likes = a.likes || [];
  const i = likes.indexOf(req.user.id);
  if (i >= 0) likes.splice(i, 1); else likes.push(req.user.id);
  db.update('announcements', a.id, { likes });
  res.json({ liked: i < 0, likeCount: likes.length });
});

const shapeComment = (c, users, me) => {
  const u = users.find((x) => x.id === c.authorId) || {};
  return { ...c, authorName: u.name || 'Former member', authorRole: u.role || 'student', avatarUrl: avatarUrl(u), mine: c.authorId === me.id };
};

router.get('/:id/comments', (req, res) => {
  const users = db.all('users');
  res.json(
    db.filter('comments', (c) => c.announcementId === req.params.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => shapeComment(c, users, req.user))
  );
});

router.post('/:id/comments', (req, res) => {
  if (!db.find('announcements', (x) => x.id === req.params.id)) return res.status(404).json({ error: 'Announcement not found.' });
  const text = String(req.body.text || '').trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: 'Write a comment first.' });
  const c = db.insert('comments', { announcementId: req.params.id, authorId: req.user.id, text }, { max: 2000 });
  res.json(shapeComment(c, db.all('users'), req.user));
});

// Authors can delete their own comments; teachers can delete any.
router.delete('/:id/comments/:cid', (req, res) => {
  const c = db.find('comments', (x) => x.id === req.params.cid && x.announcementId === req.params.id);
  if (!c) return res.status(404).json({ error: 'Comment not found.' });
  if (c.authorId !== req.user.id && req.user.role !== 'teacher') return res.status(403).json({ error: 'You can only delete your own comments.' });
  db.remove('comments', (x) => x.id === c.id);
  res.json({ ok: true });
});

router.delete('/:id', requireTeacher, (req, res) => {
  const a = db.find('announcements', (x) => x.id === req.params.id);
  if (a) {
    files.remove(a.attachments);
    db.remove('comments', (c) => c.announcementId === a.id);
    db.remove('announcements', (x) => x.id === a.id);
  }
  res.json({ ok: true });
});

module.exports = router;
