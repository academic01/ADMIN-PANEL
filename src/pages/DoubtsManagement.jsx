import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Calendar, User, BookOpen, Check, HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function DoubtsManagement() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, pending, answered
  
  // Expanded rows state for answered doubts
  const [expandedDoubts, setExpandedDoubts] = useState({});

  // Modal State
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [adminAnswer, setAdminAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDoubts();
  }, []);

  const loadDoubts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'doubts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const rawDoubts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Perform Joins
      const resolvedDoubts = await Promise.all(
        rawDoubts.map(async (doubt) => {
          let studentName = 'Unnamed Student';
          let studentPhone = '';
          let courseTitle = 'General Doubt';

          // Join Student
          if (doubt.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', doubt.userId));
              if (userDoc.exists()) {
                studentName = userDoc.data().name || 'Unnamed Student';
                studentPhone = userDoc.data().phone || '';
              }
            } catch (err) {
              console.error("Error fetching user for doubt", err);
            }
          }

          // Join Course
          if (doubt.courseId) {
            try {
              const courseDoc = await getDoc(doc(db, 'courses', doubt.courseId));
              if (courseDoc.exists()) {
                courseTitle = courseDoc.data().title || 'Course';
              }
            } catch (err) {
              console.error("Error fetching course for doubt", err);
            }
          }

          return {
            ...doubt,
            studentName,
            studentPhone,
            courseTitle
          };
        })
      );

      setDoubts(resolvedDoubts);
    } catch (e) {
      console.error("Error loading doubts:", e);
    }
    setLoading(false);
  };

  const handleOpenAnswerModal = (doubt) => {
    setSelectedDoubt(doubt);
    setAdminAnswer('');
    setShowAnswerModal(true);
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!adminAnswer.trim()) return;

    setSubmitting(true);
    try {
      const doubtRef = doc(db, 'doubts', selectedDoubt.id);
      await updateDoc(doubtRef, {
        answer: adminAnswer.trim(),
        status: 'answered',
        answeredAt: serverTimestamp()
      });

      // Update state locally
      setDoubts(prev => prev.map(d => 
        d.id === selectedDoubt.id 
          ? { ...d, status: 'answered', answer: adminAnswer.trim(), answeredAt: new Date() } 
          : d
      ));

      setShowAnswerModal(false);
      setSelectedDoubt(null);
    } catch (err) {
      alert("Error saving answer: " + err.message);
    }
    setSubmitting(false);
  };

  const toggleExpand = (id) => {
    setExpandedDoubts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredDoubts = doubts.filter(doubt => {
    if (activeTab === 'pending') return doubt.status === 'pending';
    if (activeTab === 'answered') return doubt.status === 'answered';
    return true;
  });

  const statusColors = {
    pending: '#F5A623',
    answered: '#22C55E'
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <h2>Doubts Resolution Panel</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Answer student queries, explain concepts and review submitted doubts.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', margin: '24px 0 32px 0', gap: '8px' }}>
        {[
          { id: 'all', label: `All Doubts (${doubts.length})` },
          { id: 'pending', label: `Pending (${doubts.filter(d => d.status === 'pending').length})` },
          { id: 'answered', label: `Answered (${doubts.filter(d => d.status === 'answered').length})` }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px', border: 'none', background: 'transparent',
                borderBottom: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Doubts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="loading-state">Loading doubts...</div>
        ) : filteredDoubts.length > 0 ? (
          filteredDoubts.map(doubt => {
            const isExpanded = expandedDoubts[doubt.id];
            return (
              <div key={doubt.id} style={{
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-card)', overflow: 'hidden'
              }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>{doubt.studentName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({doubt.studentPhone || 'No Phone'})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> {doubt.courseTitle}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {doubt.createdAt?.toDate ? doubt.createdAt.toDate().toLocaleDateString('en-IN') : ''}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        backgroundColor: (statusColors[doubt.status] || '#888') + '20',
                        color: statusColors[doubt.status] || '#888',
                        padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700'
                      }}>
                        {doubt.status?.toUpperCase()}
                      </span>
                      
                      {doubt.status === 'pending' ? (
                        <button className="primary-button" onClick={() => handleOpenAnswerModal(doubt)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                          <Check size={16} />
                          <span>Answer Doubt</span>
                        </button>
                      ) : (
                        <button className="secondary-button" onClick={() => toggleExpand(doubt.id)} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span>{isExpanded ? 'Collapse' : 'View Answer'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-lg)', borderLeft: '3px solid var(--accent)', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {doubt.questionText}
                  </div>
                </div>

                {/* Expanded Answer Row */}
                {doubt.status === 'answered' && isExpanded && (
                  <div style={{ padding: '20px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>Resolution & Explanation:</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Resolved on: {doubt.answeredAt?.toDate ? doubt.answeredAt.toDate().toLocaleDateString('en-IN') : ''}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {doubt.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="table-container" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No doubts submitted yet.
          </div>
        )}
      </div>

      {/* ANSWER MODAL */}
      {showAnswerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Resolve Student Doubt</h3>
              <button className="close-btn" onClick={() => setShowAnswerModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAnswerSubmit} className="modal-form">
              <div className="form-group" style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Student Question</label>
                <p style={{ margin: '8px 0 0 0', fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {selectedDoubt.questionText}
                </p>
              </div>

              <div className="form-group">
                <label>Resolution Explanation *</label>
                <textarea
                  required
                  rows="6"
                  value={adminAnswer}
                  onChange={e => setAdminAnswer(e.target.value)}
                  placeholder="Provide detailed answer, steps or reference text..."
                ></textarea>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowAnswerModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="primary-button">
                  <Check size={18} />
                  <span>{submitting ? 'Submitting Resolution...' : 'Submit Answer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
