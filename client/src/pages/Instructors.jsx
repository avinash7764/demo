import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function Stars({ value }) {
  return (
    <span className="stars" style={{ fontSize: 15 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? '' : 'off'}>★</span>
      ))}
    </span>
  );
}

export default function Instructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/courses/instructors', { auth: false })
      .then((d) => setInstructors(d.instructors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="sub-hero">
        <div className="inner">
          <h1>Meet our instructors</h1>
          <p>Learn directly from experienced practitioners who know their craft inside out.</p>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : instructors.length === 0 ? (
          <div className="empty-state"><div className="big">👩‍🏫</div><p>No instructors yet.</p></div>
        ) : (
          <div className="instructor-grid">
            {instructors.map((i) => (
              <div className="card instructor-card" key={i.name}>
                <div className="avatar">{initials(i.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{i.name}</h3>
                  <div className="i-meta">
                    {i.avg_rating > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Stars value={i.avg_rating} /> {i.avg_rating.toFixed(1)} ({i.review_count})
                      </span>
                    ) : (
                      'New instructor'
                    )}
                  </div>
                  <div className="i-stats">
                    <div className="i-stat"><b>{i.course_count}</b> courses</div>
                    <div className="i-stat"><b>{i.student_count}</b> students</div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Link to={`/?q=${encodeURIComponent(i.name)}`} className="btn btn-outline btn-sm">
                      View courses
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
