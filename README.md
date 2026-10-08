# Classroom

Node.js + Express + Socket.IO, with JSON files as the database.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill it in
3. `npm run dev` then open http://localhost:3000

The first start creates a teacher account from `TEACHER_EMAIL` / `TEACHER_PASSWORD`.
Students sign up on the login page. A sign-up that includes `TEACHER_CODE` becomes a teacher.

## Deploy on Render
- Build command: `npm install`  |  Start command: `node server.js`
- Environment: `NODE_ENV=production`, `SESSION_SECRET`, `TEACHER_EMAIL`, `TEACHER_PASSWORD`, `TEACHER_CODE`

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
