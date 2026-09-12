import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../lib/api.js';
import { useToast } from '../components/toast.jsx';
import Quiz from '../components/Quiz.jsx';
import Discussion from '../components/Discussion.jsx';

function fmt(sec) {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtClock(sec) {
  if (sec == null || isNaN(sec)) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

// Lightweight markdown renderer for lecture notes (headings, bold, code, lists, paragraphs).
function renderMarkdown(text) {
  const lines = text.split('\n');
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) { out.push(`</${list}>`); list = null; }
  };
  for (const raw of lines) {
    const line = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const trimmed = line.trim();
    if (/^#{1,6}\s/.test(trimmed)) {
      closeList();
      const level = trimmed.match(/^#+/)[0].length;
      const t = trimmed.replace(/^#+\s/, '');
      out.push(`<h${Math.min(level + 2, 6)}>${inlineMd(t)}</h${Math.min(level + 2, 6)}>`);
    } else if (/^[-*+]\s+/.test(trimmed)) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inlineMd(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inlineMd(trimmed.replace(/^\d+[.)]\s+/, ''))}</li>`);
    } else if (trimmed === '') {
      closeList();
    } else if (/^---+$/.test(trimmed)) {
      closeList();
      out.push('<hr/>');
    } else {
      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

function inlineMd(t) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function CoursePlayer() {
  const { id } = useParams();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [watched, setWatched] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [notes, setNotes] = useState(null);
  const videoRef = useRef(null);
  const lastReport = useRef(0);

  const flatLessons = useMemo(
    () => (course ? course.modules.flatMap((m) => m.lessons) : []),
    [course]
  );

  useEffect(() => {
    api(`/courses/${id}`)
      .then((d) => {
        setCourse(d.course);
        const flat = d.course.modules.flatMap((m) => m.lessons);
        const firstIncomplete = flat.find((l) => !l.completed) || flat[0];
        setActive(firstIncomplete || null);
      })
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [id]);

  const markComplete = useCallback((lesson) => {
    api(`/student/lessons/${lesson.id}/progress`, { method: 'POST', body: { completed: true } }).then((d) => {
      setCourse((c) => ({
        ...c,
        progress: d.progress,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: true } : l)),
        })),
      }));
    });
  }, []);

  const saveProgress = useCallback((lesson, seconds, completed = false) => {
    if (!lesson) return;
    api(`/student/lessons/${lesson.id}/progress`, {
      method: 'POST',
      body: { watched_sec: Math.floor(seconds), completed },
    }).then((d) => {
      setCourse((c) => ({
        ...c,
        progress: d.progress,
        modules: completed
          ? c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: true } : l)),
            }))
          : c.modules,
      }));
    }).catch(() => {});
  }, []);

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !active) return;
    setWatched(v.currentTime);
    if (v.currentTime - lastReport.current >= 5) {
      lastReport.current = v.currentTime;
      const isDone = v.duration > 0 && v.currentTime / v.duration > 0.9;
      saveProgress(active, v.currentTime, isDone);
    }
  }

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (!v || !active) return;
    v.playbackRate = speed;
    if (active.watched_sec > 5 && active.watched_sec < v.duration - 10) {
      v.currentTime = active.watched_sec;
    }
  }

  function onEnded() {
    const v = videoRef.current;
    if (active) {
      saveProgress(active, v?.duration || active.duration_sec || 0, true);
    }
    goNext();
  }

  function onPause() {
    const v = videoRef.current;
    if (active && v) saveProgress(active, v.currentTime);
  }

  function goNext() {
    const i = flatLessons.findIndex((l) => l.id === active?.id);
    if (i >= 0 && i < flatLessons.length - 1) setActive(flatLessons[i + 1]);
  }
  function goPrev() {
    const i = flatLessons.findIndex((l) => l.id === active?.id);
    if (i > 0) setActive(flatLessons[i - 1]);
  }

  function skip(sec) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + sec));
  }

  function changeSpeed(s) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  // Load notes preview when the active lesson changes.
  useEffect(() => {
    if (!active) return;
    setNotes(null);
    api(`/student/lessons/${active.id}/notes-preview`)
      .then((d) => setNotes(d))
      .catch(() => setNotes(null));
  }, [active?.id]);

  // Reset watch state when switching lessons.
  useEffect(() => {
    lastReport.current = 0;
    setWatched(active?.watched_sec || 0);
  }, [active?.id]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play(); else v.pause();
      } else if (e.key === 'ArrowRight') {
        skip(10);
      } else if (e.key === 'ArrowLeft') {
        skip(-10);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!course) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <div className="big">🔍</div>
          <p>Course not found.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to My Learning</Link>
        </div>
      </div>
    );
  }

  const videoUrl = active?.video_path
    ? `/api/student/lessons/${active.id}/stream?token=${encodeURIComponent(getToken())}`
    : null;
  const notesUrl = active?.notes_path
    ? `/api/student/lessons/${active.id}/notes?token=${encodeURIComponent(getToken())}`
    : null;

  const activeIndex = flatLessons.findIndex((l) => l.id === active?.id);
  const nextLesson = activeIndex >= 0 && activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : null;

  const watchPercent = active && active.duration_sec
    ? Math.min(100, Math.round((watched / active.duration_sec) * 100))
    : 0;

  return (
    <div className="player-shell">
      <div className="player-main">
        <div className="video-wrap">
          {videoUrl ? (
            <video
              key={active.id}
              ref={videoRef}
              src={videoUrl}
              controls
              controlsList="nodownload"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={onEnded}
              onPause={onPause}
            />
          ) : (
            <div className="video-empty">
              <div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div>
              {active ? 'No video uploaded for this lesson yet.' : 'Select a lesson to begin.'}
            </div>
          )}
        </div>

        {active && (
          <>
            <h2>{active.title}</h2>
            <div className="p-meta">
              {fmt(active.duration_sec)} {active.description ? ` · ${active.description}` : ''}
            </div>

            {/* Playback controls */}
            <div className="player-controls">
              <button className="btn btn-outline btn-sm" onClick={() => skip(-10)} title="Back 10s (←)">⏪ 10s</button>
              <button className="btn btn-outline btn-sm" onClick={() => skip(10)} title="Forward 10s (→)">10s ⏩</button>
              <div className="speed-control">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={`speed-btn ${speed === s ? 'active' : ''}`}
                    onClick={() => changeSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <span className="watch-progress">
                {fmtClock(watched)} / {fmtClock(active.duration_sec)} · {watchPercent}% watched
              </span>
            </div>

            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={goPrev} disabled={activeIndex === 0}>
                ← Previous
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => markComplete(active)} disabled={active.completed}>
                {active.completed ? '✓ Completed' : 'Mark complete'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={goNext} disabled={activeIndex === flatLessons.length - 1}>
                Next →
              </button>
              {notesUrl && (
                <a className="btn btn-outline btn-sm" href={notesUrl} target="_blank" rel="noreferrer">
                  📄 Download notes
                </a>
              )}
            </div>

            {/* Up next preview */}
            {nextLesson && (
              <button className="up-next" onClick={goNext}>
                <span className="up-label">Up next</span>
                <span className="up-title">{nextLesson.title}</span>
                <span className="up-meta">{nextLesson.video_path ? '🎬 ' : ''}{fmt(nextLesson.duration_sec)}</span>
                <span className="up-arrow">→</span>
              </button>
            )}

            {/* Inline notes preview */}
            {notes && !notes.binary && (
              <div className="notes-box">
                <div className="notes-head">
                  <strong>📝 Lecture notes</strong>
                  {notesUrl && (
                    <a href={notesUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Download</a>
                  )}
                </div>
                <div className="notes-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(notes.preview) }} />
              </div>
            )}
            {notes?.binary && (
              <div className="notes-box">
                <div className="notes-head">
                  <strong>📄 {notes.name}</strong>
                  {notesUrl && (
                    <a href={notesUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Download</a>
                  )}
                </div>
                <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  This note is a document file — download it to view.
                </p>
              </div>
            )}

            <Quiz lessonId={active.id} />
            <Discussion lessonId={active.id} />
          </>
        )}
      </div>

      <aside className="player-side">
        <div className="side-head">
          <Link to="/dashboard" className="back">← My Learning</Link>
          <h3 style={{ margin: '6px 0 0' }}>{course.title}</h3>
        </div>
        <div className="side-progress">
          <div className="p-label">{course.progress}% complete</div>
          <div className="progress"><span style={{ width: `${course.progress}%` }} /></div>
        </div>

        <ul className="lesson-nav">
          {course.modules.map((m) => (
            <li key={m.id}>
              <div className="module-label">{m.title}</div>
              <ul className="lesson-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {m.lessons.map((l) => {
                  const lp = l.duration_sec ? Math.min(100, Math.round(((l.watched_sec || 0) / l.duration_sec) * 100)) : 0;
                  return (
                    <li
                      key={l.id}
                      className={`lesson-nav-item ${l.id === active?.id ? 'active' : ''}`}
                      onClick={() => setActive(l)}
                    >
                      <span
                        className={`l-check ${l.completed ? 'done' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!l.completed) markComplete(l);
                        }}
                        title={l.completed ? 'Completed' : 'Mark complete'}
                      >
                        {l.completed ? '✓' : ''}
                      </span>
                      <span className="l-body">
                        <span className="t">{l.title}</span>
                        <span className="m">
                          {l.video_path ? '🎬 ' : ''}{fmt(l.duration_sec)}
                          {lp > 0 && !l.completed ? ` · ${lp}%` : ''}
                        </span>
                        {lp > 0 && !l.completed && (
                          <span className="lesson-watchbar"><span style={{ width: `${lp}%` }} /></span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
