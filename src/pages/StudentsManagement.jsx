import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { Search, Filter, Download, Eye, ShieldAlert, ShieldCheck, X } from 'lucide-react';

export default function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterClass, setFilterClass] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      // Fallback if index missing
      try {
        const snap = await getDocs(collection(db, 'users'));
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(allUsers.filter(u => u.role === 'student'));
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const handleToggleBlock = async (student) => {
    const newActiveState = student.isActive === false ? true : false;
    const actionText = newActiveState ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${actionText} ${student.name || 'this student'}?`)) return;

    try {
      await updateDoc(doc(db, 'users', student.id), { isActive: newActiveState });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isActive: newActiveState } : s));
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent(prev => ({ ...prev, isActive: newActiveState }));
      }
    } catch (e) {
      alert('Error updating user status: ' + e.message);
    }
  };

  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingModalData(true);
    setEnrollments([]);
    setTestHistory([]);
    try {
      // Fetch enrollments
      const enrollQuery = query(collection(db, 'enrollments'), where('userId', '==', student.id));
      const enrollSnap = await getDocs(enrollQuery);
      setEnrollments(enrollSnap.docs.map(d => d.data()));

      // Fetch test history
      const testsQuery = query(
        collection(db, 'testResults'),
        where('userId', '==', student.id),
        orderBy('submittedAt', 'desc')
      );
      const testsSnap = await getDocs(testsQuery);
      setTestHistory(testsSnap.docs.map(d => d.data()));
    } catch (e) {
      console.error("Error loading modal data", e);
      // Fallback
      try {
        const testsSnap = await getDocs(collection(db, 'testResults'));
        setTestHistory(testsSnap.docs.map(d => d.data()).filter(r => r.userId === student.id));
      } catch (err) {
        console.error(err);
      }
    }
    setLoadingModalData(false);
  };

  // CSV Export logic
  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Class', 'Target Course', 'XP', 'Joined Date', 'Status'];
    const rows = filteredStudents.map(student => [
      student.name || 'Unnamed',
      student.phone || '',
      student.currentClass || '',
      student.targetCourse || '',
      student.xp || 0,
      student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString('en-IN') : '',
      student.isActive !== false ? 'Active' : 'Blocked'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.phone || '').includes(searchTerm);
    
    const matchesClass = filterClass === 'All' || String(student.currentClass) === filterClass;
    
    const matchesCourse = filterCourse === 'All' || 
      (student.targetCourse?.toLowerCase() || '').includes(filterCourse.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || 
      (filterStatus === 'Active' && student.isActive !== false) ||
      (filterStatus === 'Inactive' && student.isActive === false);

    return matchesSearch && matchesClass && matchesCourse && matchesStatus;
  });

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header">
        <div>
          <h2>Students Directory</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {filteredStudents.length} of {students.length} students showing
          </p>
        </div>
        <button className="secondary-button" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="management-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Class:</span>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}>
              <option value="All">All Classes</option>
              {[6, 7, 8, 9, 10, 11, 12].map(c => (
                <option key={c} value={String(c)}>Class {c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Target:</span>
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}>
              <option value="All">All Targets</option>
              <option value="School">School (VI-X)</option>
              <option value="Senior">Senior (XI-XII)</option>
              <option value="CUET">CUET</option>
              <option value="Govt">Govt Jobs</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive/Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading students...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Class</th>
                <th>Target Course</th>
                <th>XP & Rank</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';
                  return (
                    <tr key={student.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-main)',
                            display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                            fontWeight: '700', color: 'var(--primary)', fontSize: '14px'
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div className="font-medium">{student.name || 'Unnamed'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{student.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>{student.phone || 'N/A'}</td>
                      <td>{student.currentClass ? `Class ${student.currentClass}` : 'N/A'}</td>
                      <td>{student.targetCourse || 'N/A'}</td>
                      <td className="font-medium" style={{ color: 'var(--accent)' }}>
                        {student.xp || 0} XP • <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>{student.rank || 'Novice'}</span>
                      </td>
                      <td>
                        {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: student.isActive !== false ? 'var(--success)20' : '#88888820',
                          color: student.isActive !== false ? 'var(--success)' : '#888888',
                          padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600'
                        }}>
                          {student.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="icon-btn edit" onClick={() => handleViewStudent(student)} title="View Details">
                          <Eye size={16} />
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => handleToggleBlock(student)} 
                          style={{ color: student.isActive !== false ? 'var(--error)' : 'var(--success)' }}
                          title={student.isActive !== false ? 'Block Account' : 'Unblock Account'}
                        >
                          {student.isActive !== false ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Student Details</h3>
              <button className="close-btn" onClick={() => setSelectedStudent(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto', padding: '24px' }}>
              
              {/* Profile Header Card */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '24px'
                }}>
                  {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '20px' }}>{selectedStudent.name || 'Unnamed Student'}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
                    📞 {selectedStudent.phone || 'No phone'} &nbsp;•&nbsp; ✉️ {selectedStudent.email || 'No email'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0' }}>
                    Joined: {selectedStudent.createdAt?.toDate ? selectedStudent.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    backgroundColor: selectedStudent.isActive !== false ? 'var(--success)20' : '#88888820',
                    color: selectedStudent.isActive !== false ? 'var(--success)' : '#888888',
                    padding: '8px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '700'
                  }}>
                    {selectedStudent.isActive !== false ? 'ACTIVE' : 'BLOCKED'}
                  </span>
                </div>
              </div>

              {/* Grid sections */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
                
                {/* Profile Details */}
                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Info</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div><strong>School/College:</strong> {selectedStudent.schoolName || 'N/A'}</div>
                    <div><strong>Current Class:</strong> {selectedStudent.currentClass || 'N/A'}</div>
                    <div><strong>Target Course:</strong> {selectedStudent.targetCourse || 'N/A'}</div>
                    <div><strong>Target Exam:</strong> {selectedStudent.targetExam || 'N/A'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <strong>Profile Completed:</strong>
                      <span style={{
                        backgroundColor: selectedStudent.profileComplete ? 'var(--success)20' : 'var(--error)20',
                        color: selectedStudent.profileComplete ? 'var(--success)' : 'var(--error)',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700'
                      }}>
                        {selectedStudent.profileComplete ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gamification Info */}
                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gamification</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div><strong>XP Score:</strong> {selectedStudent.xp || 0} XP</div>
                    <div><strong>Rank Level:</strong> {selectedStudent.rank || 'Novice'}</div>
                    <div><strong>Current Streak:</strong> 🔥 {selectedStudent.streak || 0} Days</div>
                    <div>
                      <strong>Badges Earned:</strong>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {selectedStudent.badges && selectedStudent.badges.length > 0 ? (
                          selectedStudent.badges.map((b, idx) => (
                            <span key={idx} style={{ backgroundColor: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-light)' }}>
                              🏆 {b}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No badges unlocked yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrolled Courses */}
              <div style={{ marginTop: '24px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Enrolled Courses</h5>
                {loadingModalData ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading enrollments...</div>
                ) : enrollments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {enrollments.map((enroll, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                          <span>{enroll.courseTitle || 'Course'}</span>
                          <span>{enroll.progress || 0}% Complete</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${enroll.progress || 0}%`, height: '100%', backgroundColor: 'var(--success)' }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          Enrolled: {enroll.enrolledAt?.toDate ? enroll.enrolledAt.toDate().toLocaleDateString('en-IN') : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Not enrolled in any courses.</p>
                )}
              </div>

              {/* Test History */}
              <div style={{ marginTop: '24px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase' }}>Test History</h5>
                {loadingModalData ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading tests...</div>
                ) : testHistory.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Test Title</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Score</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Percentage</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testHistory.map((test, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>{test.testTitle || 'Test'}</td>
                          <td style={{ padding: '10px 12px' }}>{test.score} / {test.totalMarks}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: '600' }}>
                            {Math.round((test.score / test.totalMarks) * 100)}%
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                            {test.submittedAt?.toDate ? test.submittedAt.toDate().toLocaleDateString('en-IN') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No tests completed yet.</p>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="secondary-button" onClick={() => setSelectedStudent(null)}>
                  Close
                </button>
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={() => handleToggleBlock(selectedStudent)}
                  style={{ backgroundColor: selectedStudent.isActive !== false ? 'var(--error)' : 'var(--success)' }}
                >
                  {selectedStudent.isActive !== false ? 'Block Account' : 'Unblock Account'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
