// Tiny JSON-file database. Every other file talks to data only through this module,
// so you can swap in MongoDB/Postgres later by rewriting just this file.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, 'data');
fs.mkdirSync(DIR, { recursive: true });

const cache = {};
const queues = {};
const file = (name) => path.join(DIR, `${name}.json`);

function load(name) {
  if (!cache[name]) {
    try { cache[name] = JSON.parse(fs.readFileSync(file(name), 'utf8')); }
    catch { cache[name] = []; }
  }
  return cache[name];
}

// Writes are queued per collection and use a temp file + rename so a crash can't corrupt the JSON.
function persist(name) {
  queues[name] = (queues[name] || Promise.resolve())
    .then(async () => {
      const tmp = file(name) + '.tmp';
      await fs.promises.writeFile(tmp, JSON.stringify(cache[name], null, 2));
      await fs.promises.rename(tmp, file(name));
    })
    .catch((err) => console.error(`Failed to save ${name}:`, err));
  return queues[name];
}

module.exports = {
  all: (name) => load(name).slice(),
  find: (name, fn) => load(name).find(fn),
  filter: (name, fn) => load(name).filter(fn),

  insert(name, data, { max } = {}) {
    const list = load(name);
    const row = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
    list.push(row);
    if (max && list.length > max) list.splice(0, list.length - max);
    persist(name);
    return row;
  },

  update(name, id, patch) {
    const row = load(name).find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    persist(name);
    return row;
  },

  remove(name, fn) {
    const list = load(name);
    const kept = list.filter((r) => !fn(r));
    const removed = list.length - kept.length;
    if (removed) { cache[name] = kept; persist(name); }
    return removed;
  },
};
