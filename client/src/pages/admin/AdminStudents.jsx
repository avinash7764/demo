import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/toast.jsx';

export default function AdminStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api('/admin/students').then((d) => setStudents(d.students)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(s) {
    if (!confirm(`Delete ${s.name}'s account and all their progress?`)) return;
    try {
      await api(`/admin/students/${s.id}`, { method: 'DELETE' });
      toast('Student removed');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <>
      <div className="page-head">
        <h1>Students</h1>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <div className="big">👥</div>
          <p>No students have signed up yet.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Courses</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.course_count}</td>
                  <td>{new Date(s.created_at + 'Z').toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/students/${s.id}`} className="btn btn-outline btn-sm">View</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
