import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, thumbUrl } from '../../lib/api.js';
import { useToast } from '../../components/toast.jsx';

export default function AdminCourses() {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api('/admin/courses').then((d) => setCourses(d.courses)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(c) {
    if (!confirm(`Delete "${c.title}"? This removes all its lessons, videos and notes.`)) return;
    try {
      await api(`/admin/courses/${c.id}`, { method: 'DELETE' });
      toast('Course deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Courses</h1>
        <Link to="/admin/courses/new" className="btn btn-primary">+ New course</Link>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <div className="big">📚</div>
          <p>No courses yet. Create your first one!</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Course</th>
                <th>Category</th>
                <th>Lessons</th>
                <th>Students</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const t = thumbUrl(c.thumbnail);
                return (
                  <tr key={c.id}>
                    <td>{t ? <img className="thumb-sm" src={t} alt="" /> : <div className="thumb-sm" style={{ display: 'grid', placeItems: 'center' }}>📚</div>}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.instructor}</div>
                    </td>
                    <td>{c.category}</td>
                    <td>{c.lesson_count}</td>
                    <td>{c.student_count}</td>
                    <td>
                      <span className={`badge ${c.published ? 'success' : ''}`}>
                        {c.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/courses/${c.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
