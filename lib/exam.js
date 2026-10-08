// Helpers for self-grading exam HTML files (the kind with a `const CONFIG = {...}` line).

// Pull the questions and answer key out of an uploaded exam file.
function parseExam(html) {
  const m = /const\s+CONFIG\s*=\s*(\{.*\});?\s*$/m.exec(html);
  if (!m) throw new Error('This file is not a supported exam: no CONFIG found.');
  let cfg;
  try { cfg = JSON.parse(m[1]); } catch { throw new Error('Could not read the exam settings in this file.'); }
  const data = cfg.examData;
  if (!Array.isArray(data) || !data.length) throw new Error('This exam has no questions.');
  data.forEach((q, i) => {
    const ok = q && typeof q.questionText === 'string' && Array.isArray(q.options) &&
      Number.isInteger(q.correctAnswerIndex) && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length;
    if (!ok) throw new Error(`Question ${i + 1} is missing a valid correct answer.`);
  });
  return {
    subject: String(cfg.subject || 'Homework').slice(0, 150),
    durationMinutes: Number(cfg.durationMinutes) || 0,
    questions: data.map((q) => ({ text: q.questionText, options: q.options, correctIndex: q.correctAnswerIndex })),
  };
}

// Mark a student's chosen option indexes (-1 = unanswered) against the stored key.
function gradeExam(questions, chosen) {
  let correct = 0, wrong = 0, unanswered = 0;
  const answers = questions.map((q, i) => {
    const c = Array.isArray(chosen) && Number.isInteger(chosen[i]) && chosen[i] >= 0 && chosen[i] < q.options.length ? chosen[i] : -1;
    const result = c === -1 ? 'unanswered' : c === q.correctIndex ? 'correct' : 'wrong';
    if (result === 'correct') correct++; else if (result === 'wrong') wrong++; else unanswered++;
    return { number: i + 1, chosenIndex: c, correctIndex: q.correctIndex, result };
  });
  return { score: correct, total: questions.length, correctCount: correct, wrongCount: wrong, unansweredCount: unanswered, answers };
}

// Script added to the exam page when it is served. It reports the finished exam to the
// classroom page (via postMessage) and shows the server's "saved" confirmation inside the exam.
const BRIDGE = `<style>.teacher-access{display:none!important}</style><script>
(function(){
  var sent=false;
  function status(t,ok){var s=document.getElementById('save-status');if(!s)return;s.textContent=t;s.style.color=ok===false?'#dc2626':ok?'#16a34a':'#555';s.classList.remove('hidden');}
  function secs(t){var m=/^(\\d+):(\\d+)$/.exec((t||'').trim());return m?(+m[1])*60+(+m[2]):0;}
  function send(){
    var answers=[];
    document.querySelectorAll('.question-container').forEach(function(q){
      var idx=-1;q.querySelectorAll('.student-answer').forEach(function(r,i){if(r.checked)idx=i;});answers.push(idx);
    });
    var tu=document.getElementById('time-used-display');
    parent.postMessage({source:'classroom-exam',type:'submit',answers:answers,timeUsedSeconds:secs(tu&&tu.textContent)},'*');
  }
  function watch(){
    var rd=document.getElementById('result-display');if(!rd)return;
    new MutationObserver(function(){
      if(sent||rd.classList.contains('hidden'))return;
      sent=true;status('Saving your marks…');send();
    }).observe(rd,{attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('message',function(e){
    if(e.source!==parent||!e.data||e.data.source!=='classroom-parent')return;
    status(e.data.text,e.data.ok);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
</script>`;

function injectBridge(html) {
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + BRIDGE) : BRIDGE + html;
}

module.exports = { parseExam, gradeExam, injectBridge };
