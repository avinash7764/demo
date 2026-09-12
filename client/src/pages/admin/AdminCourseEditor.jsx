import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, thumbUrl } from '../../lib/api.js';
import { useToast } from '../../components/toast.jsx';
import QuizEditor from '../../components/QuizEditor.jsx';

const CATEGORIES = [
  'Web Development', 'Data Science', 'Design', 'Business',
  'Marketing', 'Mobile Development', 'Cloud', 'General',
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

function LessonForm({ lesson, moduleId, onDone, onCancel }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [duration, setDuration] = useState(lesson?.duration_sec || '');
  const [video, setVideo] = useState(null);
  const [notes, setNotes] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('duration_sec', duration || '0');
      if (video) fd.append('video', video);
      if (notes) fd.append('notes', notes);

      if (lesson) {
        await api(`/admin/lessons/${lesson.id}`, { method: 'PUT', formData: fd });
        toast('Lesson updated');
      } else {
        await api(`/admin/modules/${moduleId}/lessons`, { method: 'POST', formData: fd });
        toast('Lesson added');
      }
      onDone();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="editor-card card" style={{ marginBottom: 16 }}>
      <h3>{lesson ? 'Edit lesson' : 'Add lesson'}</h3>
      <div className="field">
        <label>Title</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
      </div>
      <div className="field">
        <label>Duration (seconds)</label>
        <input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 600" />
      </div>
      <div className="field">
        <label>Video file (MP4 / WebM / MOV)</label>
        <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideo(e.target.files[0])} />
        {lesson?.video_path && <div className="hint has">Current video: {lesson.video_path.split('/').pop()}</div>}
      </div>
      <div className="field">
        <label>Notes file (PDF / DOC / TXT / MD …)</label>
        <input type="file" onChange={(e) => setNotes(e.target.files[0])} />
        {lesson?.notes_name && <div className="hint has">Current notes: {lesson.notes_name}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminCourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const editing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [level, setLevel] = useState('Beginner');
  const [instructor, setInstructor] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [published, setPublished] = useState(true);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [lessonFormFor, setLessonFormFor] = useState(null); // { moduleId } or { lesson } for edit
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [quizForLesson, setQuizForLesson] = useState(null); // lesson object

  const saveBtnRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    api(`/admin/courses/${id}`)
      .then((d) => {
        const c = d.course;
        setTitle(c.title);
        setDescription(c.description);
        setCategory(c.category);
        setLevel(c.level);
        setInstructor(c.instructor);
        setIsFree(!!c.is_free);
        setPublished(!!c.published);
        setThumbnail(c.thumbnail);
        setModules(c.modules);
      })
      .catch(() => toast('Could not load course', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveMeta(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('category', category);
      fd.append('level', level);
      fd.append('instructor', instructor);
      fd.append('is_free', isFree);
      fd.append('published', published);
      if (thumbFile) fd.append('thumbnail', thumbFile);

      if (editing) {
        const d = await api(`/admin/courses/${id}`, { method: 'PUT', formData: fd });
        setThumbnail(d.course.thumbnail);
        toast('Course saved');
      } else {
        const d = await api('/admin/courses', { method: 'POST', formData: fd });
        toast('Course created — now add modules & lessons');
        navigate(`/admin/courses/${d.course.id}/edit`, { replace: true });
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addModule() {
    const t = prompt('Module title:');
    if (!t) return;
    try {
      const d = await api(`/admin/courses/${id}/modules`, { method: 'POST', body: { title: t } });
      setModules((m) => [...m, { ...d.module, lessons: [] }]);
      toast('Module added');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function renameModule(m) {
    try {
      const d = await api(`/admin/modules/${m.id}`, { method: 'PUT', body: { title: moduleTitleDraft } });
      setModules((mods) => mods.map((x) => (x.id === m.id ? { ...x, title: d.module.title } : x)));
      setEditingModuleId(null);
      toast('Module renamed');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteModule(m) {
    if (!confirm(`Delete module "${m.title}" and all its lessons?`)) return;
    try {
      await api(`/admin/modules/${m.id}`, { method: 'DELETE' });
      setModules((mods) => mods.filter((x) => x.id !== m.id));
      toast('Module deleted');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteLesson(l) {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    try {
      await api(`/admin/lessons/${l.id}`, { method: 'DELETE' });
      setModules((mods) => mods.map((m) => ({
        ...m,
        lessons: m.lessons.filter((x) => x.id !== l.id),
      })));
      toast('Lesson deleted');
    } catch (e) { toast(e.message, 'error'); }
  }

  function refreshAfterLesson() {
    setLessonFormFor(null);
    api(`/admin/courses/${id}`).then((d) => setModules(d.course.modules));
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-head">
        <h1>{editing ? 'Edit course' : 'New course'}</h1>
        <Link to="/admin/courses" className="btn btn-ghost">← Back to courses</Link>
      </div>

      <div className="admin-editor">
        {/* LEFT: course meta */}
        <form className="card editor-card" onSubmit={saveMeta}>
          <h3>Course details</h3>
          <div className="field">
            <label>Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Instructor</label>
            <input value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="Instructor name" />
          </div>
          <div className="field">
            <label>Thumbnail image</label>
            <input type="file" accept="image/*" onChange={(e) => setThumbFile(e.target.files[0])} />
            {thumbnail && <img src={thumbUrl(thumbnail)} alt="" style={{ width: 120, borderRadius: 8, marginTop: 8 }} />}
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <label className="checkbox">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> Free course
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
            </label>
          </div>
          <button className="btn btn-primary btn-lg" disabled={saving} ref={saveBtnRef}>
            {saving ? 'Saving…' : 'Save course'}
          </button>
        </form>

        {/* RIGHT: modules & lessons */}
        <div>
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Modules & Lessons</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addModule} disabled={!editing}>
              + Add module
            </button>
          </div>

          {!editing && (
            <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
              <p>Save the course first to add modules and lessons.</p>
            </div>
          )}

          {editing && modules.length === 0 && (
            <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
              <p>No modules yet. Add your first module above.</p>
            </div>
          )}

          {modules.map((m) => (
            <div className="module-edit" key={m.id}>
              <div className="m-head">
                {editingModuleId === m.id ? (
                  <>
                    <input value={moduleTitleDraft} onChange={(e) => setModuleTitleDraft(e.target.value)} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={() => renameModule(m)}>Save</button>
                  </>
                ) : (
                  <>
                    <strong style={{ flex: 1 }}>{m.title}</strong>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{m.lessons.length} lessons</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingModuleId(m.id); setModuleTitleDraft(m.title); }}>Rename</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setLessonFormFor({ moduleId: m.id }); }}>+ Lesson</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteModule(m)}>Delete</button>
                  </>
                )}
              </div>

              {lessonFormFor?.moduleId === m.id && (
                <LessonForm moduleId={m.id} onDone={refreshAfterLesson} onCancel={() => setLessonFormFor(null)} />
              )}

              {m.lessons.map((l) => (
                quizForLesson?.id === l.id ? (
                  <QuizEditor
                    key={`quiz-${l.id}`}
                    lessonId={l.id}
                    lessonTitle={l.title}
                    onClose={() => setQuizForLesson(null)}
                  />
                ) : lessonFormFor?.lesson?.id === l.id ? (
                  <LessonForm key={l.id} lesson={l} onDone={refreshAfterLesson} onCancel={() => setLessonFormFor(null)} />
                ) : (
                  <div className="lesson-edit" key={l.id}>
                    <span style={{ fontSize: 15, paddingTop: 6 }}>🎬</span>
                    <div className="l-main">
                      <strong style={{ fontSize: 14 }}>{l.title}</strong>
                      <div className="file-hint" style={{ color: 'var(--text-muted)' }}>
                        {l.video_path ? '🎥 video' : '⚠️ no video'} · {l.notes_name ? '📄 ' + l.notes_name : 'no notes'} · {l.duration_sec ? `${l.duration_sec}s` : '0s'}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setLessonFormFor({ lesson: l })}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setQuizForLesson(l)}>Quiz</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteLesson(l)}>✕</button>
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
