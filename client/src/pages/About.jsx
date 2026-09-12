import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const FEATURES = [
  { icon: '🎬', title: 'Expert video lessons', desc: 'Watch high-quality, on-demand lectures you can pause, rewind and revisit anytime.' },
  { icon: '📄', title: 'Downloadable notes', desc: 'Every lesson comes with lecture notes — PDFs, docs and more — to study offline.' },
  { icon: '📈', title: 'Progress tracking', desc: 'See exactly where you are in every course and pick up right where you left off.' },
  { icon: '🏅', title: 'Certificates', desc: 'Earn a verified certificate of completion for every course you finish.' },
  { icon: '⭐', title: 'Real reviews', desc: 'Learn from honest ratings and reviews left by fellow students.' },
  { icon: '🎓', title: 'Learn at your pace', desc: 'Self-paced courses that fit around your schedule, on any device.' },
];

const STEPS = [
  { n: '1', title: 'Create an account', desc: 'Sign up with just your email in under a minute.' },
  { n: '2', title: 'Pick a course', desc: 'Browse the catalog, filter by topic and level, and enroll.' },
  { n: '3', title: 'Learn & track progress', desc: 'Watch lessons, download notes, and watch your progress bar fill up.' },
  { n: '4', title: 'Earn your certificate', desc: 'Finish the course and download a certificate of completion.' },
];

export default function About() {
  const { user } = useAuth();
  return (
    <>
      <section className="sub-hero">
        <div className="inner">
          <h1>About LearnHub</h1>
          <p>
            We're on a mission to make high-quality learning accessible to everyone,
            everywhere — with courses you can watch, read, and complete at your own pace.
          </p>
        </div>
      </section>

      <div className="container">
        <div className="section-title"><h2>Why learn with LearnHub?</h2></div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="card feature-card" key={f.title}>
              <div className="f-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="section-title"><h2>How it works</h2></div>
        <div className="feature-grid">
          {STEPS.map((s) => (
            <div className="card feature-card" key={s.n}>
              <div className="f-icon" style={{ color: 'var(--primary)', fontWeight: 800 }}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ justifyContent: 'center' }}>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">Go to My Learning</Link>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/register" className="btn btn-primary btn-lg">Get started free</Link>
              <Link to="/" className="btn btn-outline btn-lg">Browse courses</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
