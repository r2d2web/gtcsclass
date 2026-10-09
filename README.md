# Classroom

Node.js + Express + Socket.IO, with JSON files as the database.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill it in
3. `npm run dev` then open http://localhost:3000

The teacher account lives in `data/users.json` (username `admin`). Everyone who signs up on the login page is a student.
Passwords are stored as plain text.

## Deploy on Render
- Build command: `npm install`  |  Start command: `node server.js`
- Environment: `NODE_ENV=production`, `SESSION_SECRET`

## Free-tier limits
Render's free filesystem resets on every redeploy, restart and spin-down, so data written at runtime
(users, posts, submissions, messages) is lost. Sessions are also kept in memory. All data access goes
through `db.js`, so moving to MongoDB Atlas or Postgres later means rewriting only that file.

## Homework files
Teachers can upload a self-grading exam `.html` file (like `homework_4.html`) when creating an assignment.
- Students open it inside the classroom (`/classwork/<id>`). It runs in a sandboxed frame, so the uploaded
  JavaScript cannot touch the student's login session.
- When the student submits, the frame reports their chosen answers; the server marks them against the answer key
  read from the file's `CONFIG` line and stores the score. One attempt per student.
- Teachers see score, percentage, time used and per-question answers, can export a CSV, and can remove a
  result ("Allow retake").
- Note: the file the student receives contains the answer key, so a determined student could read it in the page source.

## Stream attachments
Teachers can attach up to 5 files (5 MB each: images, PDF, Office files, txt, csv, zip) to an announcement.
Files are saved in `data/uploads` (git-ignored) and, like all runtime data, are lost on Render's free tier when the service restarts.
Only the allowed types are accepted, and files are served with headers that stop them running as pages.
