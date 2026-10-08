const router = require('express').Router();
const db = require('../db');
const { parseExam, gradeExam, injectBridge } = require('../lib/exam');
const { requireLogin, requireTeacher, requireStudent } = require('../middleware/auth');

router.use(requireLogin);

// Never send the exam file or answer key to the browser in normal API responses.
const pub = (a) => {
  const { examHtml, examData, ...rest } = a;
  return { ...rest, isExam: a.type === 'exam', questionCount: examData ? examData.length : 0 };
};
const mySub = (aId, uId) => db.find('submissions', (s) => s.assignmentId === aId && s.studentId === uId) || null;

router.get('/', (req, res) => {
  const subs = db.all('submissions');
  const list = db.all('assignments')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) =>
      req.user.role === 'teacher'
        ? { ...pub(a), submissionCount: subs.filter((s) => s.assignmentId === a.id).length }
        : { ...pub(a), submission: subs.find((s) => s.assignmentId === a.id && s.studentId === req.user.id) || null }
    );
  res.json(list);
});

router.post('/', requireTeacher, (req, res) => {
  const base = {
    dueDate: String(req.body.dueDate || '').slice(0, 10),
    createdBy: req.user.id,
  };
  // Exam upload: an HTML file with questions and an answer key.
  if (req.body.examHtml) {
    const html = String(req.body.examHtml);
    let exam;
    try { exam = parseExam(html); } catch (e) { return res.status(400).json({ error: e.message }); }
    const title = String(req.body.title || '').trim().slice(0, 150) || exam.subject;
    return res.json(pub(db.insert('assignments', {
      ...base, title, type: 'exam', instructions: String(req.body.instructions || '').trim().slice(0, 5000),
      points: exam.questions.length, durationMinutes: exam.durationMinutes,
      examHtml: html, examData: exam.questions,
    })));
  }
  const title = String(req.body.title || '').trim().slice(0, 150);
  if (!title) return res.status(400).json({ error: 'Give the assignment a title.' });
  const points = Number(req.body.points);
  res.json(pub(db.insert('assignments', {
    ...base, title, type: 'text',
    instructions: String(req.body.instructions || '').trim().slice(0, 5000),
    points: Number.isFinite(points) && points > 0 ? points : 100,
  })));
});

// Submissions and grading routes come before '/:id' routes so they are never shadowed.
router.post('/submissions/:id/grade', requireTeacher, (req, res) => {
  const sub = db.find('submissions', (s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });
  const assignment = db.find('assignments', (a) => a.id === sub.assignmentId);
  if (assignment.type === 'exam') return res.status(400).json({ error: 'Exams are graded automatically.' });
  const grade = Number(req.body.grade);
  if (!Number.isFinite(grade) || grade < 0 || grade > assignment.points)
    return res.status(400).json({ error: `Enter a grade from 0 to ${assignment.points}.` });
  res.json(db.update('submissions', sub.id, { grade, feedback: String(req.body.feedback || '').trim().slice(0, 2000) }));
});

// Teacher removes a submission so the student can try again.
router.delete('/submissions/:id', requireTeacher, (req, res) => {
  db.remove('submissions', (s) => s.id === req.params.id);
  res.json({ ok: true });
});

router.get('/:id', (req, res) => {
  const a = db.find('assignments', (x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found.' });
  res.json({ ...pub(a), submission: req.user.role === 'student' ? mySub(a.id, req.user.id) : null });
});

router.delete('/:id', requireTeacher, (req, res) => {
  db.remove('assignments', (a) => a.id === req.params.id);
  db.remove('submissions', (s) => s.assignmentId === req.params.id);
  res.json({ ok: true });
});

router.get('/:id/submissions', requireTeacher, (req, res) => {
  const a = db.find('assignments', (x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found.' });
  const users = db.all('users');
  res.json({
    questions: a.examData || [],
    submissions: db.filter('submissions', (s) => s.assignmentId === a.id).map((s) => ({
      ...s, studentName: (users.find((u) => u.id === s.studentId) || {}).name || 'Unknown student',
    })),
  });
});

// The exam page itself. It runs uploaded JavaScript, so it is always sandboxed: the browser gives it
// an empty origin, which means it cannot read the student's session or call this site's API.
router.get('/:id/exam', (req, res) => {
  const a = db.find('assignments', (x) => x.id === req.params.id);
  if (!a || a.type !== 'exam') return res.status(404).json({ error: 'Exam not found.' });
  if (req.user.role === 'student' && mySub(a.id, req.user.id))
    return res.status(403).json({ error: 'You have already handed this in.' });
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': 'sandbox allow-scripts',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.send(injectBridge(a.examHtml));
});

// Student finishes the exam: the server marks it against the stored answer key and saves the marks.
router.post('/:id/exam-submit', requireStudent, (req, res) => {
  const a = db.find('assignments', (x) => x.id === req.params.id);
  if (!a || a.type !== 'exam') return res.status(404).json({ error: 'Exam not found.' });
  if (mySub(a.id, req.user.id)) return res.status(400).json({ error: 'You have already handed this in.' });
  const result = gradeExam(a.examData, req.body.answers);
  const maxSeconds = (a.durationMinutes || 24 * 60) * 60;
  const timeUsedSeconds = Math.min(maxSeconds, Math.max(0, Math.round(Number(req.body.timeUsedSeconds) || 0)));
  const sub = db.insert('submissions', {
    assignmentId: a.id, studentId: req.user.id, kind: 'exam', content: '',
    submittedAt: new Date().toISOString(), grade: result.score, feedback: '', timeUsedSeconds, ...result,
  });
  res.json({ score: sub.score, total: sub.total });
});

router.post('/:id/submit', requireStudent, (req, res) => {
  const assignment = db.find('assignments', (a) => a.id === req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  if (assignment.type === 'exam') return res.status(400).json({ error: 'Open the homework to complete it.' });
  const content = String(req.body.content || '').trim().slice(0, 5000);
  if (!content) return res.status(400).json({ error: 'Add your answer before submitting.' });

  const existing = mySub(assignment.id, req.user.id);
  if (existing) {
    if (existing.grade != null) return res.status(400).json({ error: 'This work is already graded.' });
    return res.json(db.update('submissions', existing.id, { content, submittedAt: new Date().toISOString() }));
  }
  res.json(db.insert('submissions', {
    assignmentId: assignment.id, studentId: req.user.id, content,
    submittedAt: new Date().toISOString(), grade: null, feedback: '',
  }));
});

module.exports = router;
