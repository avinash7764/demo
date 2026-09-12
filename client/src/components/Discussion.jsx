import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from './toast.jsx';

function timeAgo(ts) {
  const d = new Date(ts + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function Discussion({ lessonId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState([]);
  const [replies, setReplies] = useState({});
  const [body, setBody] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api(`/student/lessons/${lessonId}/discussions`)
      .then((d) => { setThreads(d.threads); setReplies(d.replies); })
      .catch(() => {});
  }
  useEffect(load, [lessonId]);

  async function post(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/student/lessons/${lessonId}/discussions`, { method: 'POST', body: { body } });
      setBody('');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function postReply(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      await api(`/student/lessons/${lessonId}/discussions`, { method: 'POST', body: { body: replyBody, parent_id: replyingTo } });
      setReplyBody('');
      setReplyingTo(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this message?')) return;
    await api(`/admin/discussions/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="discussion-box">
      <h3>💬 Discussion</h3>

      <form className="discussion-form" onSubmit={post}>
        <textarea
          placeholder="Ask a question or share a thought about this lesson…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div>
          <button className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
            Post
          </button>
        </div>
      </form>

      {threads.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No discussions yet. Start the conversation!</p>
      )}

      {threads.map((t) => (
        <div className="discussion-post" key={t.id}>
          <div className="d-head">
            <span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{t.author?.[0]?.toUpperCase() || 'U'}</span>
            <span className="d-author">{t.author}</span>
            <span className="d-when">{timeAgo(t.created_at)}</span>
          </div>
          <div className="d-body">{t.body}</div>
          <div className="d-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(replyingTo === t.id ? null : t.id)}>
              Reply
            </button>
            {user?.role === 'admin' && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(t.id)}>
                Delete
              </button>
            )}
          </div>

          {replyingTo === t.id && (
            <form className="discussion-form" onSubmit={postReply} style={{ marginTop: 8 }}>
              <textarea
                placeholder="Write a reply…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" disabled={busy || !replyBody.trim()}>Reply</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReplyingTo(null); setReplyBody(''); }}>Cancel</button>
              </div>
            </form>
          )}

          {(replies[t.id] || []).map((r) => (
            <div className="discussion-replies" key={r.id}>
              <div className="discussion-post" style={{ borderTop: 'none' }}>
                <div className="d-head">
                  <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{r.author?.[0]?.toUpperCase() || 'U'}</span>
                  <span className="d-author">{r.author}</span>
                  <span className="d-when">{timeAgo(r.created_at)}</span>
                </div>
                <div className="d-body">{r.body}</div>
                {user?.role === 'admin' && (
                  <div className="d-actions">
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(r.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
