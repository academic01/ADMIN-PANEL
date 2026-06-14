import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AdminLogin from './pages/AdminLogin';
import CoursesManagement from './pages/CoursesManagement';
import LiveClasses from './pages/LiveClasses';
import DashboardOverview from './pages/DashboardOverview';
import StudentsManagement from './pages/StudentsManagement';
import SettingsManagement from './pages/SettingsManagement';
import TestsManagement from './pages/TestsManagement';
import NotificationsManagement from './pages/NotificationsManagement';
import PaymentsManagement from './pages/PaymentsManagement';
import DoubtsManagement from './pages/DoubtsManagement';
import CourseVideosPage from './pages/CourseVideos';
import { LayoutDashboard, BookOpen, Video, ClipboardList, MessageSquare, Users, Bell, CreditCard, Settings, LogOut } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'live', label: 'Live Classes', icon: Video },
  { id: 'tests', label: 'Tests', icon: ClipboardList },
  { id: 'doubts', label: 'Doubts', icon: MessageSquare },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [pageParams, setPageParams] = useState({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const doc_ = await getDoc(doc(db, 'users', user.uid));
          if (doc_.data()?.role === 'admin') {
            setUser(user);
            setIsAdmin(true);
          } else {
            setUser(null);
            setIsAdmin(false);
            await auth.signOut();
          }
        } catch (error) {
          console.error("Error fetching admin status:", error);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin />;
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon-small" style={{ backgroundColor: '#F5A623', color: '#0D2240' }}>A</div>
          <h2>Admin Panel</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div key={item.id} className="nav-item disabled">
                  <Icon size={20} />
                  <span>{item.label} (Soon)</span>
                </div>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => auth.signOut()} className="logout-button">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-greeting">
            <h1>Welcome back, Admin 👋</h1>
            <p>Managing Aakash Academics with ease.</p>
          </div>
          <div className="header-profile">
            <div className="profile-avatar">AD</div>
          </div>
        </header>
        
        <div className="content-area">
          {activePage === 'dashboard' && <DashboardOverview setPage={setActivePage} />}
          {activePage === 'courses' && <CoursesManagement setPage={setActivePage} setPageParams={setPageParams} />}
          {activePage === 'live' && <LiveClasses />}
          {activePage === 'students' && <StudentsManagement />}
          {activePage === 'settings' && <SettingsManagement />}
          {activePage === 'tests' && <TestsManagement />}
          {activePage === 'doubts' && <DoubtsManagement />}
          {activePage === 'notifications' && <NotificationsManagement />}
          {activePage === 'payments' && <PaymentsManagement />}
          {activePage === 'course-videos' && (
            <CourseVideosPage 
              courseId={pageParams.courseId} 
              courseTitle={pageParams.courseTitle} 
              setPage={setActivePage} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
