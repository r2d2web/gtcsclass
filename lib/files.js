// Saves files attached to announcements into data/uploads and tracks them by id.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(DIR, { recursive: true });

// Only these types are accepted. Anything else (html, svg, js, exe...) is refused, so uploaded
// files can never run as a page on this site.
const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', zip: 'application/zip',
};
const IMAGES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

// `list` is [{ name, data(base64) }]. Validates everything first, then writes, so a bad file saves nothing.
function saveAll(list) {
  if (list == null) return [];
  if (!Array.isArray(list)) throw new Error('Invalid attachments.');
  if (list.length > MAX_FILES) throw new Error(`You can attach up to ${MAX_FILES} files.`);
  const ready = list.map((f) => {
    const name = String((f && f.name) || '').replace(/[\x00-\x1f\\/]/g, '').trim().slice(0, 120);
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (!TYPES[ext]) throw new Error(`"${name || 'That file'}" is not an allowed file type.`);
    const buf = Buffer.from(String((f && f.data) || ''), 'base64');
    if (!buf.length) throw new Error(`"${name}" is empty.`);
    if (buf.length > MAX_BYTES) throw new Error(`"${name}" is larger than 5 MB.`);
    return { name, ext, buf };
  });
  return ready.map(({ name, ext, buf }) => {
    const id = crypto.randomUUID();
    fs.writeFileSync(path.join(DIR, `${id}.${ext}`), buf);
    return { id, name, ext, size: buf.length, isImage: IMAGES.has(ext) };
  });
}

const pathFor = (att) => path.join(DIR, `${att.id}.${att.ext}`);
const remove = (list) => (list || []).forEach((a) => fs.unlink(pathFor(a), () => {}));

module.exports = { saveAll, pathFor, remove, TYPES, MAX_FILES, MAX_BYTES };
