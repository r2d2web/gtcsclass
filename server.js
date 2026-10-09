const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const db = require('./db');
const { attachUser, requirePage } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) console.warn('Set SESSION_SECRET in your environment!');

app.set('trust proxy', 1); // Render sits behind a proxy
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 },
});

app.post('/api/classwork', express.json({ limit: '3mb' })); // creating an assignment can include an exam file
app.use(express.json({ limit: '100kb' }));
app.use(sessionMiddleware);
app.use(attachUser);

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/classwork', require('./routes/classwork'));
app.use('/api/chat', require('./routes/chat'));

// Pages. The three app pages live in /views so they can't be fetched while signed out.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) =>
  req.user ? res.redirect('/stream') : res.sendFile(path.join(__dirname, 'public', 'login.html'))
);
app.get('/classwork/:id', requirePage, (req, res) => res.sendFile(path.join(__dirname, 'views', 'exam.html')));
for (const page of ['stream', 'classwork', 'chat']) {
  app.get(`/${page}`, requirePage, (req, res) => res.sendFile(path.join(__dirname, 'views', `${page}.html`)));
}

// Real-time chat. Sockets share the Express session, so only signed-in users can connect.
io.engine.use(sessionMiddleware);
io.use((socket, next) => {
  const id = socket.request.session && socket.request.session.userId;
  const user = id && db.find('users', (u) => u.id === id);
  if (!user) return next(new Error('unauthorized'));
  socket.user = user;
  next();
});
io.on('connection', (socket) => {
  socket.on('message', (raw) => {
    const text = String(raw || '').trim().slice(0, 1000);
    if (!text) return;
    const msg = db.insert('messages', { userId: socket.user.id, text }, { max: 500 });
    io.emit('message', { ...msg, name: socket.user.name, role: socket.user.role });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Classroom running on port ${PORT}`));
