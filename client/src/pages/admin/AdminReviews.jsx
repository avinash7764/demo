import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/toast.jsx';

function Stars({ value }) {
  return (
    <span className="stars" style={{ fontSize: 15 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? '' : 'off'}>★</span>
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api('/admin/reviews').then((d) => setReviews(d.reviews)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(r) {
    if (!confirm(`Delete this review by ${r.student_name}?`)) return;
    try {
      await api(`/admin/reviews/${r.id}`, { method: 'DELETE' });
      toast('Review deleted');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <>
      <div className="page-head">
        <h1>Reviews</h1>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : reviews.length === 0 ? (
        <div className="empty-state"><div className="big">⭐</div><p>No reviews yet.</p></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Student</th>
                <th>Course</th>
                <th>Comment</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td><Stars value={r.rating} /></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.student_email}</div>
                  </td>
                  <td>{r.course_title}</td>
                  <td style={{ maxWidth: 360 }}>{r.comment || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{new Date(r.created_at + 'Z').toLocaleDateString()}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
