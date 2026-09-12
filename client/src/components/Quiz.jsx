import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from './toast.jsx';

export default function Quiz({ lessonId }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    setResult(null);
    setAnswers({});
    api(`/student/lessons/${lessonId}/quiz`)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [lessonId]);

  async function submit() {
    setSubmitting(true);
    try {
      const r = await api(`/student/lessons/${lessonId}/quiz/submit`, { method: 'POST', body: { answers } });
      setResult(r);
      const d = await api(`/student/lessons/${lessonId}/quiz`);
      setData(d);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (!data) return null;

  const { quiz, questions, best, passed, attempts } = data;

  return (
    <div className="quiz-box">
      <h3>📝 {quiz.title}</h3>
      <div className="q-sub">
        {questions.length} question{questions.length === 1 ? '' : 's'} · pass mark {quiz.pass_percent}%
        {best != null && ` · your best: ${best}% (${passed ? 'passed ✓' : 'not passed yet'}) · ${attempts} attempt${attempts === 1 ? '' : 's'}`}
      </div>

      {result ? (
        <div className="quiz-result">
          <div className={`score ${result.passed ? '' : 'fail'}`}>{result.score}%</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            You got {result.correct} of {result.total} correct.
            {result.passed ? ' Great job!' : ' Review the answers and try again.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Retake quiz</button>
          </div>

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            {questions.map((q, i) => {
              const res = result.results.find((r) => r.id === q.id);
              const chosen = res?.chosen;
              return (
                <div className="quiz-question" key={q.id}>
                  <div className="q-text">{i + 1}. {q.question}</div>
                  {[['a', q.option_a], ['b', q.option_b], ['c', q.option_c], ['d', q.option_d]].map(([letter, text]) => {
                    if (!text) return null;
                    let cls = '';
                    if (letter === res?.correct) cls = 'correct';
                    else if (letter === chosen && !res?.isCorrect) cls = 'wrong';
                    return (
                      <div className={`quiz-option ${cls}`} key={letter}>
                        <span className="opt-letter">{letter.toUpperCase()}</span>
                        <span>{text}</span>
                        {letter === res?.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {questions.map((q, i) => (
            <div className="quiz-question" key={q.id}>
              <div className="q-text">{i + 1}. {q.question}</div>
              {[['a', q.option_a], ['b', q.option_b], ['c', q.option_c], ['d', q.option_d]].map(([letter, text]) => {
                if (!text) return null;
                const selected = answers[q.id] === letter;
                return (
                  <div
                    className={`quiz-option ${selected ? 'selected' : ''}`}
                    key={letter}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
                  >
                    <span className="opt-letter">{letter.toUpperCase()}</span>
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting || Object.keys(answers).length < questions.length}
            >
              {submitting ? 'Submitting…' : 'Submit quiz'}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          </div>
        </>
      )}
    </div>
  );
}
