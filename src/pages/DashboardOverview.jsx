import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { Users, BookOpen, GraduationCap, ClipboardCheck, ArrowRight, UserPlus, BookOpenCheck } from 'lucide-react';

function getRelativeTime(timestamp) {
  if (!timestamp) return 'some time ago';
  let date;
  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  return `${diffInDays} days ago`;
}

export default function DashboardOverview({ setPage }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    testsCompleted: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // 1. STATS
        // Students Count
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnap = await getDocs(studentsQuery);
        
        // Active Courses Count
        const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'active'));
        const coursesSnap = await getDocs(coursesQuery);
        
        // Enrollments Count
        const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
        
        // Tests Completed Count
        const testsSnap = await getDocs(collection(db, 'testResults'));

        setStats({
          totalStudents: studentsSnap.size,
          activeCourses: coursesSnap.size,
          totalEnrollments: enrollmentsSnap.size,
          testsCompleted: testsSnap.size
        });

        // 2. RECENT REGISTRATIONS
        const regQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const regSnap = await getDocs(regQuery);
        setRecentRegistrations(regSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 3. RECENT ENROLLMENTS
        const enrollQuery = query(
          collection(db, 'enrollments'),
          orderBy('enrolledAt', 'desc'),
          limit(5)
        );
        const enrollSnap = await getDocs(enrollQuery);
        const rawEnrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Perform Join to fetch student names
        const enrollmentsWithNames = await Promise.all(
          rawEnrollments.map(async (enroll) => {
            let studentName = 'Unknown Student';
            if (enroll.userId) {
              try {
                const userDoc = await getDoc(doc(db, 'users', enroll.userId));
                if (userDoc.exists()) {
                  studentName = userDoc.data().name || userDoc.data().phone || 'Unnamed Student';
                }
              } catch (e) {
                console.error("Error fetching user for enrollment", e);
              }
            }
            return {
              ...enroll,
              studentName
            };
          })
        );
        setRecentEnrollments(enrollmentsWithNames);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* STATS CARDS ROW */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper users">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Students</h3>
            <p className="stat-value">{loading ? '...' : stats.totalStudents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper courses">
            <BookOpen size={24} />
          </div>
          <div className="stat-details">
            <h3>Active Courses</h3>
            <p className="stat-value">{loading ? '...' : stats.activeCourses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper revenue">
            <GraduationCap size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Enrollments</h3>
            <p className="stat-value">{loading ? '...' : stats.totalEnrollments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper engagement">
            <ClipboardCheck size={24} />
          </div>
          <div className="stat-details">
            <h3>Tests Completed</h3>
            <p className="stat-value">{loading ? '...' : stats.testsCompleted}</p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button className="primary-button" onClick={() => setPage('courses')}>
            + Add Course
          </button>
          <button className="primary-button" onClick={() => setPage('live')} style={{ backgroundColor: '#F5A623', color: '#0D2240' }}>
            + Schedule Class
          </button>
          <button className="secondary-button" onClick={() => setPage('students')}>
            View Students
          </button>
          <button className="secondary-button" onClick={() => setPage('notifications')}>
            Send Notification
          </button>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="overview-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Recent Registrations */}
        <div className="list-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} style={{ color: 'var(--accent)' }} />
            <span>Recent Registrations</span>
          </h3>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading registrations...</div>
          ) : recentRegistrations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {recentRegistrations.map((student) => (
                <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {student.name || student.phone || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Class: {student.currentClass || 'N/A'} • Target: {student.targetCourse || 'N/A'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {getRelativeTime(student.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No students registered yet.
            </div>
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="list-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpenCheck size={20} style={{ color: 'var(--success)' }} />
            <span>Recent Enrollments</span>
          </h3>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading enrollments...</div>
          ) : recentEnrollments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {recentEnrollments.map((enroll) => (
                <div key={enroll.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {enroll.studentName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Course: {enroll.courseTitle || 'N/A'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {getRelativeTime(enroll.enrolledAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No enrollments yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
