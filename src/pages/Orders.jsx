import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, getDoc, doc, updateDoc, addDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { Clipboard, CheckCircle, XCircle, Eye, Search, Filter, Calendar } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'verified', 'rejected'
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all', 'course', 'package'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Screenshot Overlay State
  const [screenshotOverlayUrl, setScreenshotOverlayUrl] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubOrders = onSnapshot(q, async (snap) => {
      const rawOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch user details for studentName and studentPhone
      const ordersWithUsers = await Promise.all(rawOrders.map(async (order) => {
        let studentName = 'Unnamed Student';
        let studentPhone = '';
        if (order.userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', order.userId));
            if (userSnap.exists()) {
              studentName = userSnap.data().name || 'Unnamed Student';
              studentPhone = userSnap.data().phone || '';
            }
          } catch (e) {
            console.error("Error fetching user for order", e);
          }
        }
        return {
          ...order,
          studentName,
          studentPhone
        };
      }));

      setOrders(ordersWithUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      setLoading(false);
    });

    return () => unsubOrders();
  }, []);

  const handleVerify = async (order) => {
    if (!window.confirm(`Verify payment and grant access for ${order.studentName} to "${order.itemName}"?`)) return;

    try {
      // 1. Update order status to verified
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'verified',
        verifiedAt: serverTimestamp()
      });

      // 2. Add document to enrollments to grant access
      await addDoc(collection(db, 'enrollments'), {
        userId: order.userId,
        itemId: order.itemId,
        itemType: order.itemType || 'course',
        itemName: order.itemName,
        enrolledAt: serverTimestamp(),
        paymentAmount: Number(order.amount) || 0,
        paymentMethod: order.paymentMethod || 'UPI',
        promoCodeUsed: order.promoCodeUsed || '',
        status: 'active'
      });

      // 3. Send Notification to user
      await addDoc(collection(db, 'notifications'), {
        title: '🎉 Course/Package Activated!',
        body: `Your payment has been verified. You can now access "${order.itemName}". Happy learning!`,
        type: 'announcement',
        target: order.userId,
        targetLabel: order.studentName,
        createdAt: serverTimestamp(),
        isRead: false
      });

      // Optional: if it is a test package, we can increment purchase counters in testPackages
      if (order.itemType === 'package') {
        try {
          await updateDoc(doc(db, 'testPackages', order.itemId), {
            totalPurchases: increment(1)
          });
        } catch (e) {
          console.log("No testPackage document matches ID for counter increment");
        }
      }

      alert("Order verified and student enrolled successfully! ✅");
    } catch (e) {
      alert("Error verifying payment: " + e.message);
    }
  };

  const handleReject = async (order) => {
    const reason = window.prompt("Enter rejection reason (shown to student):", "Incorrect receipt uploaded or payment not received.");
    if (reason === null) return; // Cancelled prompt

    try {
      // 1. Update order status to rejected
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp()
      });

      // 2. Create notification for the student
      await addDoc(collection(db, 'notifications'), {
        title: '❌ Payment Verification Failed',
        body: `Payment request for "${order.itemName}" was rejected. Reason: ${reason}`,
        type: 'announcement',
        target: order.userId,
        targetLabel: order.studentName,
        createdAt: serverTimestamp(),
        isRead: false
      });

      alert("Order rejected and student notified. ❌");
    } catch (e) {
      alert("Error rejecting order: " + e.message);
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    // Status Filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Item Type Filter
    const matchesType = itemTypeFilter === 'all' || order.itemType === itemTypeFilter;
    
    // Search Query (Student name, Phone, Order ID, Code, Item name)
    const matchesSearch = 
      (order.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.studentPhone || '').includes(searchQuery) ||
      (order.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.promoCodeUsed || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Date Range Filter
    let matchesDate = true;
    if (order.createdAt?.seconds) {
      const orderDate = new Date(order.createdAt.seconds * 1000);
      orderDate.setHours(0,0,0,0);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0,0,0,0);
        if (orderDate < from) matchesDate = false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23,59,59,999);
        if (orderDate > to) matchesDate = false;
      }
    }

    return matchesStatus && matchesType && matchesSearch && matchesDate;
  });

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header" style={{ marginBottom: '24px' }}>
        <h2>📋 Orders & Manual Payments Verification</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
          Review and approve manual UPI payment uploads to grant student access to courses and test bundles.
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
        {/* Status Tab buttons */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            ORDER STATUS
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'pending', 'verified', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '8px 16px', borderRadius: '50px', border: '1px solid #E5E5E5', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  backgroundColor: statusFilter === s ? '#0D2240' : 'white',
                  color: statusFilter === s ? 'white' : '#888',
                  textTransform: 'uppercase'
                }}
              >
                {s === 'pending' ? 'Pending verification' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div style={{ width: '240px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            SEARCH ORDER
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="Name, Phone, Item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Item Type filter */}
        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            ITEM TYPE
          </label>
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            style={{ padding: '10px', fontSize: '13px' }}
          >
            <option value="all">All Types</option>
            <option value="course">Course</option>
            <option value="package">Test Package</option>
          </select>
        </div>

        {/* Date Ranges */}
        <div style={{ display: 'flex', gap: '8px', width: '320px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              FROM DATE
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              TO DATE
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading order history...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No matching orders found.
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)' }}>
                <th style={{ padding: '16px 24px' }}>Order ID</th>
                <th>Student</th>
                <th>Item (Course/Package)</th>
                <th>Amount</th>
                <th>Promo Code</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ paddingRight: '24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      {order.id.substring(0, 8)}...
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{order.studentName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{order.studentPhone || 'No Phone'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{order.itemName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {order.itemType || 'course'}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      ₹{order.amount || 0}
                    </td>
                    <td>
                      {order.promoCodeUsed ? (
                        <span style={{ fontFamily: 'monospace', backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {order.promoCodeUsed}
                        </span>
                      ) : (
                        <span style={{ color: '#C0C0C0' }}>None</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {order.paymentMethod || 'UPI'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '50px',
                        backgroundColor: order.status === 'verified' ? '#DCFCE7' : order.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                        color: order.status === 'verified' ? '#16A34A' : order.status === 'rejected' ? '#EF4444' : '#D97706',
                        textTransform: 'uppercase'
                      }}>
                        {order.status === 'pending' ? 'Pending Review' : order.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                    </td>
                    <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {order.screenshotUrl && (
                          <button
                            onClick={() => setScreenshotOverlayUrl(order.screenshotUrl)}
                            className="secondary-button"
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="View receipt image screenshot"
                          >
                            <Eye size={13} />
                            <span>Receipt</span>
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(order)}
                              style={{
                                backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
                                padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <CheckCircle size={13} />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleReject(order)}
                              style={{
                                backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px',
                                padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SCREENSHOT PREVIEW MODAL OVERLAY */}
      {screenshotOverlayUrl && (
        <div 
          onClick={() => setScreenshotOverlayUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={screenshotOverlayUrl}
              alt="Manual payment verification screenshot uploaded by student"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', border: '4px solid white', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            />
            <button
              onClick={() => setScreenshotOverlayUrl(null)}
              style={{
                position: 'absolute', top: '-16px', right: '-16px', width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: 'white', border: 'none', color: '#333', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
