import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Bell, Send, Trash2 } from 'lucide-react';

export default function NotificationsManagement() {
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all'); // 'all' or courseDocId
  const [type, setType] = useState('announcement'); // announcement, reminder, live_class, promotion
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load active courses for dropdown
      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, title: d.data().title })));

      // Load notification history
      await loadNotifications();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadNotifications = async () => {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      // Fallback
      try {
        const snap = await getDocs(collection(db, 'notifications'));
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    const targetCourse = audience === 'all' ? null : courses.find(c => c.id === audience);
    const audienceLabel = audience === 'all' ? 'all' : targetCourse?.title || audience;

    const payload = {
      title: title.trim(),
      body: body.trim(),
      type,
      target: audience,
      targetLabel: audienceLabel,
      createdAt: serverTimestamp(),
      isRead: false
    };

    try {
      await addDoc(collection(db, 'notifications'), payload);
      showToast("Notification sent ✅");
      setTitle('');
      setBody('');
      setAudience('all');
      setType('announcement');
      await loadNotifications();
    } catch (err) {
      alert("Error sending notification: " + err.message);
    }
    setSending(false);
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Delete this notification record from database? (Will remove it from student inbox log)")) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      loadNotifications();
    } catch (e) {
      alert("Error deleting notification: " + e.message);
    }
  };

  return (
    <div className="management-container">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', backgroundColor: 'var(--primary)', color: 'white',
          padding: '16px 24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 2000,
          fontWeight: '600', animation: 'slideIn 0.3s ease'
        }}>
          {toast}
        </div>
      )}

      <div className="management-header">
        <div>
          <h2>Notifications Center</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Send push notifications or system alerts directly to target students.
          </p>
        </div>
      </div>

      <div className="overview-content-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
        
        {/* FORM */}
        <div className="table-container" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Bell size={20} style={{ color: 'var(--accent)' }} />
            <span>Compose Alert</span>
          </h3>

          <form onSubmit={handleSendNotification}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Title *</label>
                <span style={{ fontSize: '11px', color: title.length > 50 ? 'var(--error)' : 'var(--text-secondary)' }}>
                  {title.length}/50
                </span>
              </div>
              <input 
                type="text" 
                required 
                maxLength={50}
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Physics class postponed"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Message Body *</label>
                <span style={{ fontSize: '11px', color: body.length > 200 ? 'var(--error)' : 'var(--text-secondary)' }}>
                  {body.length}/200
                </span>
              </div>
              <textarea 
                required 
                rows="4" 
                maxLength={200}
                value={body} 
                onChange={e => setBody(e.target.value)} 
                placeholder="Type details of notification..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Target Audience *</label>
              <select value={audience} onChange={e => setAudience(e.target.value)}>
                <option value="all">All Students</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>Students of {course.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Notification Type *</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="announcement">Announcement</option>
                <option value="reminder">Reminder</option>
                <option value="live_class">Live Class Alert</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            <button type="submit" disabled={sending} className="primary-button" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}>
              <Send size={18} />
              <span>{sending ? 'Sending...' : 'Send Alert'}</span>
            </button>
          </form>
        </div>

        {/* LOG HISTORY */}
        <div className="table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '16px' }}>Notification History (Last 20 Alerts)</h3>
          </div>
          {loading ? (
            <div className="loading-state">Loading history...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Sent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notifications.length > 0 ? (
                  notifications.map(item => (
                    <tr key={item.id}>
                      <td style={{ maxWidth: '280px' }}>
                        <div className="font-medium" style={{ fontSize: '14px' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.body}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: '500' }}>
                        {item.targetLabel || item.target || 'All'}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--accent)' }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('en-IN') : ''}
                      </td>
                      <td>
                        <button className="icon-btn delete" onClick={() => handleDeleteNotification(item.id)} title="Delete record">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">No notifications logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
