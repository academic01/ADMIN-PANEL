import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, query, orderBy } from 'firebase/firestore';
import { AlertCircle, IndianRupee, Landmark, TrendingUp, Sparkles, Filter, Calendar } from 'lucide-react';

export default function PaymentsManagement() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Summary Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonthRevenue: 0,
    freeEnrollments: 0,
    paidEnrollments: 0
  });

  // Daily Chart Stats (Last 14 days)
  const [chartData, setChartData] = useState([]);

  // Filters
  const [filterType, setFilterType] = useState('All'); // All, Free, Paid
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc'));
      const snap = await getDocs(q);
      const rawEnrollments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch user details for each enrollment (Join)
      const enrollmentsWithUsers = await Promise.all(
        rawEnrollments.map(async (item) => {
          let studentName = 'Unnamed Student';
          let studentPhone = '';
          if (item.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', item.userId));
              if (userDoc.exists()) {
                studentName = userDoc.data().name || 'Unnamed Student';
                studentPhone = userDoc.data().phone || '';
              }
            } catch (e) {
              console.error("Error fetching user", e);
            }
          }
          return {
            ...item,
            studentName,
            studentPhone
          };
        })
      );

      setEnrollments(enrollmentsWithUsers);
      calculateStatsAndChart(enrollmentsWithUsers);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const calculateStatsAndChart = (data) => {
    let total = 0;
    let thisMonth = 0;
    let freeCount = 0;
    let paidCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Setup 14 days chart structure
    const dailyMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      dailyMap[key] = {
        dateLabel: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        rawDate: d,
        amount: 0
      };
    }

    data.forEach(item => {
      let amount = Number(item.paymentAmount) || 0;
      let date = item.enrolledAt?.toDate ? item.enrolledAt.toDate() : null;

      // Accruals
      total += amount;
      if (amount === 0) {
        freeCount++;
      } else {
        paidCount++;
      }

      if (date) {
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          thisMonth += amount;
        }

        const dateKey = date.toDateString();
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].amount += amount;
        }
      }
    });

    setStats({
      totalRevenue: total,
      thisMonthRevenue: thisMonth,
      freeEnrollments: freeCount,
      paidEnrollments: paidCount
    });

    // Format chart data
    const sortedChart = Object.values(dailyMap).sort((a, b) => a.rawDate - b.rawDate);
    setChartData(sortedChart);
  };

  // Filter application
  const filteredEnrollments = enrollments.filter(item => {
    // 1. Paid / Free toggle
    const amount = Number(item.paymentAmount) || 0;
    if (filterType === 'Free' && amount > 0) return false;
    if (filterType === 'Paid' && amount === 0) return false;

    // 2. Date filters
    const date = item.enrolledAt?.toDate ? item.enrolledAt.toDate() : null;
    if (date) {
      if (dateFrom && new Date(dateFrom + 'T00:00:00') > date) return false;
      if (dateTo && new Date(dateTo + 'T23:59:59') < date) return false;
    }

    return true;
  });

  // Simple CSS scale for Chart bars
  const maxDayAmount = Math.max(...chartData.map(d => d.amount), 1);

  return (
    <div className="management-container">
      
      {/* Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-input)', borderLeft: '4px solid var(--accent)',
        padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)'
      }}>
        <AlertCircle size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>💡 Razorpay payment gateway integration is currently in progress. The data below displays active enrollment records and their associated values.</span>
      </div>

      <div className="management-header">
        <div>
          <h2>Revenue Tracking</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Track sales volume, paid memberships, and course enrollments.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginTop: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper revenue" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Revenue</h3>
            <p className="stat-value">₹{loading ? '...' : stats.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper engagement" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <h3>This Month Revenue</h3>
            <p className="stat-value">₹{loading ? '...' : stats.thisMonthRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper courses" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            <Landmark size={24} />
          </div>
          <div className="stat-details">
            <h3>Paid Enrollments</h3>
            <p className="stat-value">{loading ? '...' : stats.paidEnrollments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper users" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            <Sparkles size={24} />
          </div>
          <div className="stat-details">
            <h3>Free Courses</h3>
            <p className="stat-value">{loading ? '...' : stats.freeEnrollments}</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart (Pure CSS bars) */}
      <div className="table-container" style={{ padding: '24px', marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Daily Sales Performance (Last 14 Days)</h3>
        {loading ? (
          <div className="loading-state">Generating chart...</div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', paddingTop: '20px', borderBottom: '1px solid var(--border-light)', gap: '8px' }}>
            {chartData.map((day, idx) => {
              const pct = (day.amount / maxDayAmount) * 100;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '4px', visibility: day.amount > 0 ? 'visible' : 'hidden' }}>
                    ₹{day.amount}
                  </div>
                  <div style={{
                    width: '70%', minWidth: '10px', height: `${Math.max(pct, 2)}%`, backgroundColor: day.amount > 0 ? 'var(--accent)' : 'var(--border-light)',
                    borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease'
                  }}></div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>
                    {day.dateLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Table View */}
      <div className="table-container" style={{ marginTop: '24px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px' }}>Enrollment Transaction Logs</h3>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '13px', outline: 'none' }}>
                <option value="All">All Transactions</option>
                <option value="Paid">Paid Only</option>
                <option value="Free">Free Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
              <span>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading transactions...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course Title</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.length > 0 ? (
                filteredEnrollments.map(item => {
                  const amount = Number(item.paymentAmount) || 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.studentName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.studentPhone || ''}</div>
                      </td>
                      <td className="font-medium">{item.courseTitle || 'Course Title'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{amount > 0 ? 'Razorpay' : 'Free Enrollment'}</td>
                      <td className="font-medium" style={{ color: amount > 0 ? 'var(--text-primary)' : 'var(--success)' }}>
                        {amount > 0 ? `₹${amount}` : 'FREE'}
                      </td>
                      <td>
                        {item.enrolledAt?.toDate ? item.enrolledAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: 'var(--success)20', color: 'var(--success)',
                          padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700'
                        }}>
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No transaction records found matching the active filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
