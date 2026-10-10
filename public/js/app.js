// Shared helpers used by every page.
async function api(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && location.pathname !== '/') { location.href = '/'; throw new Error('Signed out'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

// Builds DOM nodes with textContent only, so user-written text can never inject HTML.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtDay(day) {
  return new Date(day + 'T00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
// "11:00 AM" for today, "Oct 9" for earlier days.
function fmtShort(iso) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function toast(msg, bad) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = ''), 2800);
}

// The school logo in a white tile (hidden automatically if /logo.png is missing).
function logoTile(size) {
  return h('span', { class: 'logo-tile ' + size },
    h('img', { src: '/logo.png', alt: '', onerror: (e) => e.target.parentNode.remove() }));
}

// Fixed, built-in SVG icons (never user content).
const ICONS = {
  pdf: '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M8 3h11l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#f4eeee" stroke="#cfc3c4"/><path d="M19 3v6h6" fill="#e3d9da"/><rect x="4" y="16" width="17" height="8.5" rx="1.5" fill="#d93025"/><text x="12.5" y="22.5" font-size="6.2" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">PDF</text></svg>',
  sheet: '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M8 3h11l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#23a566"/><path d="M19 3v6h6" fill="#9ad9b9"/><path d="M10 15h12v9H10zM10 19.5h12M16 15v9" fill="none" stroke="#fff" stroke-width="1.5"/></svg>',
  image: '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><rect x="4" y="6" width="24" height="20" rx="3" fill="#2f80ed"/><circle cx="21" cy="12.5" r="2.4" fill="#fff"/><path d="M6 25l6-8 5 5 3-3 6 6z" fill="#fff"/></svg>',
  doc: '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M8 3h11l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#4285f4"/><path d="M19 3v6h6" fill="#a8c7fa"/><path d="M10 15h12M10 19h12M10 23h8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  thumb: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3z"/><path d="M7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  comment: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>',
};
function icon(name) {
  const s = h('span', { class: 'ico' });
  s.innerHTML = ICONS[name];
  return s;
}

// Round avatar: the person's photo if they have one, otherwise their initials.
// `who` is { name, avatarUrl } (a plain name string also works).
function avatar(who, size) {
  const name = typeof who === 'string' ? who : who && who.name;
  const url = typeof who === 'string' ? null : who && who.avatarUrl;
  const p = String(name || '?').trim().split(/\s+/);
  const initials = ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  const el = h('span', { class: 'avatar ' + (size || ''), 'aria-hidden': 'true' });
  if (url) el.append(h('img', { src: url, alt: '', onerror: (e) => e.target.replaceWith(document.createTextNode(initials)) }));
  else el.textContent = initials;
  return el;
}

// Crops to a centred square and shrinks to 256x256 JPEG, so uploads are small and always valid images.
async function squareJpeg(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch { throw new Error('That file is not an image this browser can read. Try a JPG or PNG.'); }
  const side = Math.min(bmp.width, bmp.height), out = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out, out);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not process that image.');
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Could not read that image.'));
    r.readAsDataURL(blob);
  });
}

// Dialog for adding, changing or removing your own profile photo.
function openProfile(user) {
  const dlg = h('dialog', { class: 'profile', 'aria-labelledby': 'pf-title' });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: 'hidden' });
  const msg = h('p', { class: 'error', role: 'alert' });
  const busy = (on) => dlg.querySelectorAll('button').forEach((b) => (b.disabled = on));
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    msg.textContent = '';
    if (f.size > 15 * 1024 * 1024) return (msg.textContent = 'Choose an image under 15 MB.');
    busy(true);
    try {
      await api('/api/profile/avatar', { method: 'POST', body: { image: await squareJpeg(f) } });
      location.reload();
    } catch (e) { msg.textContent = e.message; busy(false); file.value = ''; }
  });
  const remove = user.avatarUrl && h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
    busy(true);
    try { await api('/api/profile/avatar', { method: 'DELETE' }); location.reload(); }
    catch (e) { msg.textContent = e.message; busy(false); }
  } }, 'Remove photo');
  dlg.append(h('div', { class: 'pf-body' },
    h('h2', { id: 'pf-title' }, 'Profile photo'),
    h('div', { class: 'pf-preview' }, avatar(user, 'xl')),
    h('p', { class: 'meta', style: 'margin:0' }, user.name + ' · @' + user.username),
    h('p', { class: 'meta' }, 'Your photo shows next to your chat messages and posts. Without one, your initials are shown.'),
    file, msg,
    h('div', { class: 'row', style: 'justify-content:center' },
      h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, user.avatarUrl ? 'Change photo' : 'Choose photo'),
      remove,
      h('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, 'Close'))));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

// Renders the red header (brand, user, pill tabs) and returns the signed-in user.
async function shell(active) {
  const { user } = await api('/api/auth/me');
  const link = (href, label) => h('a', { href, 'aria-current': active === href ? 'page' : null }, label);
  document.getElementById('nav').replaceChildren(h('div', { class: 'top-inner' },
    h('div', { class: 'top-row' },
      h('div', { class: 'brand' }, logoTile(''), 'Classroom'),
      h('div', { class: 'who' },
        h('button', { class: 'avatar-btn', type: 'button', title: 'Change profile photo', 'aria-label': 'Change profile photo', onclick: () => openProfile(user) },
          avatar(user, ''), h('span', { class: 'badge' }, icon('camera'))),
        h('div', { class: 'who-text' }, h('strong', {}, user.name),
          h('button', { class: 'linkbtn', onclick: async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; } }, 'Sign out')))),
    h('nav', { class: 'pilltabs', 'aria-label': 'Main' }, link('/stream', 'Stream'), link('/classwork', 'Classwork'), link('/chat', 'Chat'))));
  return user;
}
