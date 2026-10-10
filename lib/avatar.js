// Profile photos: one small JPEG per user in data/uploads/avatars/<userId>.jpg
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'uploads', 'avatars');
fs.mkdirSync(DIR, { recursive: true });

const fileFor = (userId) => path.join(DIR, `${userId}.jpg`);

// The ?v= part changes whenever the photo changes, so browsers never show a stale one.
const avatarUrl = (u) => (u && u.avatarVersion ? `/api/profile/avatar/${u.id}?v=${u.avatarVersion}` : null);

// The browser shrinks every photo to a 256x256 JPEG before upload; this double-checks it.
function save(userId, base64) {
  const buf = Buffer.from(String(base64 || ''), 'base64');
  if (buf.length < 100) throw new Error('Could not read that image.');
  if (buf.length > 400 * 1024) throw new Error('That image is too large. Try a smaller one.');
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) throw new Error('Could not read that image.');
  fs.writeFileSync(fileFor(userId), buf);
}

const remove = (userId) => fs.unlink(fileFor(userId), () => {});

module.exports = { fileFor, avatarUrl, save, remove };
