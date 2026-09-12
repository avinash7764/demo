import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import CourseCard from '../components/CourseCard.jsx';

const CATEGORIES = ['Web Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Mobile Development', 'Cloud'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [level, setLevel] = useState('all');
  const [free, setFree] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category !== 'all') params.set('category', category);
    if (level !== 'all') params.set('level', level);
    if (free !== 'all') params.set('free', free);
    const qs = params.toString();
    api(`/courses${qs ? `?${qs}` : ''}`, { auth: false })
      .then((d) => setCourses(d.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, category, level, free]);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Learn in-demand skills with expert-led courses</h1>
          <p>
            Watch video lessons, download lecture notes, and track your progress —
            all in one place. Unlock your potential with LearnHub.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#courses" className="btn btn-lg btn-primary">
              Browse courses
            </a>
            {!user && (
              <Link to="/register" className="btn btn-lg btn-outline">
                Get started free
              </Link>
            )}
          </div>
          <div className="stats">
            <div className="stat"><b>{courses.length}</b><span>Courses</span></div>
            <div className="stat"><b>100%</b><span>Online</span></div>
            <div className="stat"><b>24/7</b><span>Access</span></div>
          </div>
        </div>
      </section>

      <div className="container" id="courses">
        <div className="section-title">
          <h2>Explore courses</h2>
        </div>

        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search courses, topics, instructors…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={free} onChange={(e) => setFree(e.target.value)}>
            <option value="all">Free & paid</option>
            <option value="1">Free only</option>
            <option value="0">Paid only</option>
          </select>
        </div>

        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="big">🔍</div>
            <p>No courses match your search.</p>
            <button className="btn btn-outline" onClick={() => { setQ(''); setCategory('all'); setLevel('all'); setFree('all'); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="result-count">{courses.length} course{courses.length === 1 ? '' : 's'} found</div>
            <div className="course-grid">
              {courses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onBookmarkToggle={(id, val) => setCourses((cs) => cs.map((x) => (x.id === id ? { ...x, bookmarked: val } : x)))}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
