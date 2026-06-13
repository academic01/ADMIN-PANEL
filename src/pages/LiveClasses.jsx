import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, deleteDoc, doc,
  serverTimestamp, orderBy, query,
  Timestamp
} from 'firebase/firestore';
import { Video, Calendar, Clock, Plus, Trash2, X, Link, Check, ExternalLink } from 'lucide-react';

export default function LiveClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    chapter: '',
    facultyName: '',
    date: '',
    time: '',
    duration: 60,
    streamUrl: '',
    courseId: '',
    sendNotification: true
  });

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'liveClasses'),
        orderBy('scheduledAt', 'desc'));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(d => ({
        id: d.id, ...d.data()
      })));
    } catch (e) {
      console.error(e);
      // Fallback
      try {
        const snap = await getDocs(collection(db, 'liveClasses'));
        setClasses(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })));
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Combine date and time
    const scheduledAt = new Date(`${formData.date}T${formData.time}`);
    
    const classData = {
      title: formData.title,
      subject: formData.subject,
      chapter: formData.chapter,
      facultyName: formData.facultyName,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      duration: Number(formData.duration),
      streamUrl: formData.streamUrl,
      courseId: formData.courseId,
      status: 'scheduled',
      registeredStudents: [],
      watchCount: 0,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'liveClasses'), classData);
      alert('Live class scheduled!');
      setShowForm(false);
      resetForm();
      loadClasses();
    } catch (e) {
      alert('Error scheduling class: ' + e.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      chapter: '',
      facultyName: '',
      date: '',
      time: '',
      duration: 60,
      streamUrl: '',
      courseId: '',
      sendNotification: true
    });
  };

  const markAsLive = async (classId) => {
    await updateDoc(doc(db, 'liveClasses', classId), { status: 'live' });
    loadClasses();
  };

  const markAsCompleted = async (classId) => {
    await updateDoc(doc(db, 'liveClasses', classId), { status: 'completed' });
    loadClasses();
  };

  const addRecording = async (classId) => {
    const url = window.prompt('Enter recording URL:');
    if (!url) return;
    await updateDoc(doc(db, 'liveClasses', classId), { recordingUrl: url, status: 'completed' });
    loadClasses();
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    await deleteDoc(doc(db, 'liveClasses', id));
    loadClasses();
  };

  const statusColors = {
    scheduled: '#F5A623',
    live: '#EF4444',
    completed: '#22C55E'
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <h2>Live Classes</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Schedule and manage live interactive broadcasts.
          </p>
        </div>
        <button className="primary-button" onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          <Plus size={18} />
          <span>Schedule Live Class</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {loading ? (
          <div className="loading-state">Loading live classes...</div>
        ) : classes.length > 0 ? (
          classes.map(cls => (
            <div key={cls.id} style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              borderLeft: `5px solid ${statusColors[cls.status] || '#888'}`,
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px', fontWeight: '700' }}>
                    {cls.title}
                  </h3>
                  <p style={{ margin: '6px 0 8px 0', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                    {cls.subject} • {cls.chapter} • {cls.facultyName}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} style={{ color: 'var(--accent)' }} /> 
                      {cls.scheduledAt?.toDate()?.toLocaleDateString('en-IN')}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} style={{ color: 'var(--accent)' }} /> 
                      {cls.scheduledAt?.toDate()?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({cls.duration} min)
                    </span>
                  </div>
                  {cls.streamUrl && (
                    <div style={{ marginTop: '12px' }}>
                      <a href={cls.streamUrl} target="_blank" rel="noopener noreferrer" className="nav-item" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                        background: 'var(--bg-main)', color: 'var(--accent)', borderRadius: 'var(--radius-md)',
                        fontSize: '12px', fontWeight: '600', textDecoration: 'none', width: 'fit-content'
                      }}>
                        <ExternalLink size={14} />
                        <span>Stream Link</span>
                      </a>
                    </div>
                  )}
                  {cls.recordingUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer" className="nav-item" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                        background: 'var(--bg-main)', color: 'var(--success)', borderRadius: 'var(--radius-md)',
                        fontSize: '12px', fontWeight: '600', textDecoration: 'none', width: 'fit-content'
                      }}>
                        <Video size={14} />
                        <span>Watch Recording</span>
                      </a>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    backgroundColor: (statusColors[cls.status] || '#888') + '20',
                    color: statusColors[cls.status] || '#888',
                    padding: '6px 14px',
                    borderRadius: '50px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {cls.status?.toUpperCase()}
                  </span>
                  
                  {cls.status === 'scheduled' && (
                    <button onClick={() => markAsLive(cls.id)} className="primary-button" style={{
                      backgroundColor: 'var(--error)', padding: '8px 16px', fontSize: '13px'
                    }}>
                      <Video size={16} />
                      <span>Go Live</span>
                    </button>
                  )}
                  
                  {cls.status === 'live' && (
                    <button onClick={() => markAsCompleted(cls.id)} className="primary-button" style={{
                      backgroundColor: 'var(--success)', padding: '8px 16px', fontSize: '13px'
                    }}>
                      <Check size={16} />
                      <span>End Class</span>
                    </button>
                  )}
                  
                  {cls.status === 'completed' && !cls.recordingUrl && (
                    <button onClick={() => addRecording(cls.id)} className="secondary-button" style={{
                      padding: '8px 16px', fontSize: '13px'
                    }}>
                      📹 Add Recording
                    </button>
                  )}
                  
                  <button onClick={() => deleteClass(cls.id)} className="icon-btn delete" style={{
                    border: '1px solid var(--border-light)', padding: '8px'
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="table-container" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No live classes scheduled yet. Create your first live session!
          </div>
        )}
      </div>

      {/* SCHEDULE CLASS MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>Schedule Live Class</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              <div className="form-group">
                <label>Class Title *</label>
                <input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Physics - Laws of Motion"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Physics"
                  />
                </div>
                <div className="form-group">
                  <label>Chapter/Topic</label>
                  <input
                    value={formData.chapter}
                    onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                    placeholder="e.g. Laws of Motion"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Faculty Name *</label>
                <input
                  required
                  value={formData.facultyName}
                  onChange={e => setFormData({ ...formData, facultyName: e.target.value })}
                  placeholder="e.g. Kishan Sharma"
                />
              </div>

              <div className="form-group">
                <label>Stream URL (YouTube Live or Zoom)</label>
                <input
                  value={formData.streamUrl}
                  onChange={e => setFormData({ ...formData, streamUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Associated Course ID (Optional)</label>
                  <input
                    value={formData.courseId}
                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                    placeholder="Course Document ID"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <span>Schedule Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
