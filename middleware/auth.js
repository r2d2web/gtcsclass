const db = require('../db');

// Loads the logged-in user (if any) onto req.user on every request.
function attachUser(req, res, next) {
  const id = req.session && req.session.userId;
  req.user = id ? db.find('users', (u) => u.id === id) || null : null;
  next();
}

const requireLogin = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Please sign in.' });

const requireTeacher = (req, res, next) =>
  req.user && req.user.role === 'teacher'
    ? next()
    : res.status(403).json({ error: 'Only teachers can do that.' });

const requireStudent = (req, res, next) =>
  req.user && req.user.role === 'student'
    ? next()
    : res.status(403).json({ error: 'Only students can do that.' });

// For HTML pages: send signed-out visitors to the login page.
const requirePage = (req, res, next) => (req.user ? next() : res.redirect('/'));

module.exports = { attachUser, requireLogin, requireTeacher, requireStudent, requirePage };
