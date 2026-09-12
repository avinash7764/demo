import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, thumbUrl } from '../../lib/api.js';

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/admin/students/${id}`)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!data) {
    return <div className="empty-state"><div className="big">🔍</div><p>Student not found.</p></div>;
  }

  const { student, courses } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/admin/students" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>← Students</Link>
          <h1>{student.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{student.email} · joined {new Date(student.created_at + 'Z').toLocaleDateString()}</p>
        </div>
      </div>

      <h3 style={{ fontSize: 16, marginBottom: 16 }}>Enrolled courses ({courses.length})</h3>
      {courses.length === 0 ? (
        <div className="empty-state"><p>This student isn't enrolled in any courses.</p></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Course</th>
                <th>Progress</th>
                <th>Enrolled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    {thumbUrl(c.thumbnail)
                      ? <img className="thumb-sm" src={thumbUrl(c.thumbnail)} alt="" />
                      : <div className="thumb-sm" style={{ display: 'grid', placeItems: 'center' }}>📚</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.title}</td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress" style={{ flex: 1 }}><span style={{ width: `${c.progress}%` }} /></div>
                      <span style={{ fontSize: 13 }}>{c.progress}%</span>
                    </div>
                  </td>
                  <td>{new Date(c.enrolled_at + 'Z').toLocaleDateString()}</td>
                  <td><Link to={`/courses/${c.id}`} className="btn btn-outline btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
