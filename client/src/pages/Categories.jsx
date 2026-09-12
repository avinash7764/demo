import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const CATEGORY_ICONS = {
  'Web Development': '💻',
  'Data Science': '📊',
  'Design': '🎨',
  'Business': '📈',
  'Marketing': '📣',
  'Mobile Development': '📱',
  'Cloud': '☁️',
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/courses/categories', { auth: false })
      .then((d) => setCategories(d.categories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="sub-hero">
        <div className="inner">
          <h1>Browse by category</h1>
          <p>Find the exact skills you want to build, organised by topic.</p>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : categories.length === 0 ? (
          <div className="empty-state"><div className="big">📚</div><p>No categories yet.</p></div>
        ) : (
          <div className="category-grid">
            {categories.map((c) => (
              <Link to={`/?category=${encodeURIComponent(c.category)}`} className="card category-card" key={c.category}>
                <div className="c-icon">{CATEGORY_ICONS[c.category] || '📚'}</div>
                <h3>{c.category}</h3>
                <div className="c-meta">
                  {c.course_count} course{c.course_count === 1 ? '' : 's'} · {c.student_count || 0} student{c.student_count === 1 ? '' : 's'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
