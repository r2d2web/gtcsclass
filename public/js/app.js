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

function toast(msg, bad) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = ''), 2800);
}

// Renders the sidebar and returns the signed-in user.
async function shell(active) {
  const { user } = await api('/api/auth/me');
  const link = (href, label) => h('a', { href, 'aria-current': active === href ? 'page' : null }, label);
  document.getElementById('nav').append(
    h('div', { class: 'brand' }, 'Classroom'),
    link('/stream', 'Stream'),
    link('/classwork', 'Classwork'),
    link('/chat', 'Chat'),
    h('div', { class: 'who' },
      h('strong', {}, user.name),
      h('small', {}, user.role === 'teacher' ? 'Teacher' : 'Student'),
      h('button', { onclick: async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; } }, 'Sign out'))
  );
  return user;
}
