import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from './toast.jsx';

const LETTERS = ['a', 'b', 'c', 'd'];

function blankQuestion() {
  return { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct: 'a' };
}

export default function QuizEditor({ lessonId, lessonTitle, onClose }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('Quiz');
  const [passPercent, setPassPercent] = useState(70);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api(`/admin/lessons/${lessonId}/quiz`)
      .then((d) => {
        setTitle(d.quiz.title);
        setPassPercent(d.quiz.pass_percent);
        setQuestions(d.questions.length ? d.questions : [blankQuestion()]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [lessonId]);

  function updateQ(i, field, value) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  }

  async function save(e) {
    e.preventDefault();
    const valid = questions.filter((q) => q.question.trim());
    if (valid.length === 0) return toast('Add at least one question', 'error');
    setBusy(true);
    try {
      await api(`/admin/lessons/${lessonId}/quiz`, {
        method: 'PUT',
        body: { title, pass_percent: passPercent, questions: valid },
      });
      toast('Quiz saved');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeQuiz() {
    if (!confirm('Delete this quiz entirely?')) return;
    await api(`/admin/lessons/${lessonId}/quiz`, { method: 'DELETE' });
    toast('Quiz deleted');
    onClose();
  }

  if (!loaded) return null;

  return (
    <form className="card editor-card" onSubmit={save} style={{ marginBottom: 16, border: '2px solid var(--primary)' }}>
      <h3>📝 Quiz — {lessonTitle}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16 }}>
        <div className="field">
          <label>Quiz title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Pass %</label>
          <input type="number" min="0" max="100" value={passPercent} onChange={(e) => setPassPercent(e.target.value)} />
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <strong>Question {i + 1}</strong>
            <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>
              Remove
            </button>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <input value={q.question} onChange={(e) => updateQ(i, 'question', e.target.value)} placeholder="Question text" />
          </div>
          {LETTERS.map((letter) => (
            <div key={letter} className="field" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ minWidth: 20, marginBottom: 0 }}>
                <input
                  type="radio"
                  name={`correct-${i}`}
                  checked={q.correct === letter}
                  onChange={() => updateQ(i, 'correct', letter)}
                  style={{ accentColor: 'var(--success)' }}
                  title="Mark as correct answer"
                />
              </label>
              <input
                value={q[`option_${letter}`]}
                onChange={(e) => updateQ(i, `option_${letter}`, e.target.value)}
                placeholder={`Option ${letter.toUpperCase()}${letter === 'a' ? ' (required)' : ' (optional)'}`}
              />
            </div>
          ))}
          <div className="hint" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Select the radio button next to the correct option.
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
        style={{ marginBottom: 16 }}
      >
        + Add question
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save quiz'}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={removeQuiz}>Delete quiz</button>
      </div>
    </form>
  );
}
