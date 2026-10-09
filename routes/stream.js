const router = require('express').Router();
const db = require('../db');
const files = require('../lib/files');
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
  const hasFiles = Array.isArray(req.body.attachments) && req.body.attachments.length > 0;
  if (!text && !hasFiles) return res.status(400).json({ error: 'Write something or attach a file.' });
  let attachments;
  try { attachments = files.saveAll(req.body.attachments); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  res.json(db.insert('announcements', { authorId: req.user.id, text, attachments }));
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
  res.sendFile(files.pathFor(att), (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

router.delete('/:id', requireTeacher, (req, res) => {
  const a = db.find('announcements', (x) => x.id === req.params.id);
  if (a) { files.remove(a.attachments); db.remove('announcements', (x) => x.id === a.id); }
  res.json({ ok: true });
});

module.exports = router;
