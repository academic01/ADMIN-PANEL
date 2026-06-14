import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { Ticket, Plus, Trash2, Edit2, Copy, Check, Calendar, TrendingUp } from 'lucide-react';

export default function PromoCodes() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'expired'
  const [expandedCodeId, setExpandedCodeId] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [applicableTo, setApplicableTo] = useState('all');
  const [maxUses, setMaxUses] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTill, setValidTill] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  // Duplicate Check
  const [availabilityStatus, setAvailabilityStatus] = useState(''); // '', 'checking', 'available', 'exists'

  // Ref for debounce timer
  const debounceRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPromoCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching promo codes:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch usage records when a row is expanded
  useEffect(() => {
    if (!expandedCodeId) {
      setUsageRecords([]);
      return;
    }

    const selectedCode = promoCodes.find(p => p.id === expandedCodeId);
    if (!selectedCode) return;

    setLoadingUsage(true);
    // Query orders/enrollments where promoCodeUsed == selectedCode.code
    const usageQuery = query(
      collection(db, 'orders'),
      where('promoCodeUsed', '==', selectedCode.code)
    );

    const unsubUsage = onSnapshot(usageQuery, (snap) => {
      setUsageRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingUsage(false);
    }, (error) => {
      console.error("Error fetching usage analytics:", error);
      setLoadingUsage(false);
    });

    return () => unsubUsage();
  }, [expandedCodeId, promoCodes]);

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopiedCode(txt);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleGenerateRandom = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = 'AAKASH';
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(randomStr);
    checkCodeDuplicate(randomStr);
  };

  const checkCodeDuplicate = async (rawCode) => {
    const formatted = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!formatted) {
      setAvailabilityStatus('');
      return;
    }

    if (editingCode && editingCode.code === formatted) {
      setAvailabilityStatus('available');
      return;
    }

    setAvailabilityStatus('checking');

    try {
      const q = query(collection(db, 'promoCodes'), where('code', '==', formatted));
      const snap = await getDocs(q);
      if (snap.empty) {
        setAvailabilityStatus('available');
      } else {
        setAvailabilityStatus('exists');
      }
    } catch (e) {
      console.error(e);
      setAvailabilityStatus('');
    }
  };

  const handleCodeChange = (val) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(formatted);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkCodeDuplicate(formatted);
    }, 400);
  };

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingCode(promo);
      setCode(promo.code);
      setDescription(promo.description || '');
      setApplicableTo(promo.applicableTo || 'all');
      setMaxUses(promo.maxUses || 0);
      setIsUnlimited((promo.maxUses || 0) === 0);
      setValidFrom(promo.validFrom ? new Date(promo.validFrom.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setValidTill(promo.validTill ? new Date(promo.validTill.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setIsActive(promo.isActive !== false);
      setAvailabilityStatus('available');
    } else {
      setEditingCode(null);
      setCode('');
      setDescription('');
      setApplicableTo('all');
      setMaxUses(0);
      setIsUnlimited(true);
      setValidFrom(new Date().toISOString().split('T')[0]);
      setValidTill(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setIsActive(true);
      setAvailabilityStatus('');
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!code || availabilityStatus !== 'available') {
      alert('Please enter a valid, unique promo code.');
      return;
    }

    const payload = {
      code: code.trim(),
      discountType: 'full_free',
      description: description.trim(),
      applicableTo,
      maxUses: isUnlimited ? 0 : Number(maxUses) || 0,
      validFrom: new Date(validFrom),
      validTill: new Date(validTill),
      isActive,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCode) {
        await updateDoc(doc(db, 'promoCodes', editingCode.id), payload);
      } else {
        await addDoc(collection(db, 'promoCodes'), {
          ...payload,
          usedCount: 0,
          usedBy: [],
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || 'admin'
        });
      }
      setShowModal(false);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this promo code?")) {
      try {
        await deleteDoc(doc(db, 'promoCodes', id));
        if (expandedCodeId === id) setExpandedCodeId(null);
      } catch (e) {
        alert(e.message);
      }
    }
  };

  // Helper status calculator
  const getPromoStatus = (promo) => {
    if (!promo.isActive) return 'inactive';
    const till = new Date(promo.validTill.seconds * 1000);
    const now = new Date();
    if (now > till) return 'expired';
    return 'active';
  };

  const filteredCodes = promoCodes.filter(promo => {
    const status = getPromoStatus(promo);
    if (filter === 'active') return status === 'active';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>🎟️ Promo Codes Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Create and track 100% free promotional codes for launch campaigns.
          </p>
        </div>
        <button className="primary-button" onClick={() => handleOpenModal()} style={{ backgroundColor: '#F5A623', color: '#0D2240' }}>
          <Plus size={18} />
          <span>Create Promo Code</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '20px', gap: '8px' }}>
        {['all', 'active', 'expired'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '12px 20px', border: 'none', background: 'transparent',
              borderBottom: filter === t ? '3px solid var(--accent)' : '3px solid transparent',
              color: filter === t ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: '600', fontSize: '14px', cursor: 'pointer', textTransform: 'capitalize'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Codes Table List */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading promo codes...</div>
        ) : filteredCodes.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No promo codes found.
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)' }}>
                <th style={{ padding: '16px 24px' }}>Code</th>
                <th>Applies To</th>
                <th>Uses (used/max)</th>
                <th>Valid Till</th>
                <th>Status</th>
                <th style={{ paddingRight: '24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map(promo => {
                const status = getPromoStatus(promo);
                const isExpanded = expandedCodeId === promo.id;
                return (
                  <React.Fragment key={promo.id}>
                    <tr 
                      onClick={() => setExpandedCodeId(isExpanded ? null : promo.id)}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(245, 166, 35, 0.05)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '16px', color: 'var(--primary)' }}>
                          {promo.code}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(promo.code); }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                          title="Copy promo code"
                        >
                          {copiedCode === promo.code ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                        </button>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px',
                          backgroundColor: promo.applicableTo === 'all' ? '#E0F2FE' : '#F3F4F6',
                          color: promo.applicableTo === 'all' ? '#0369A1' : '#374151',
                          textTransform: 'uppercase'
                        }}>
                          {promo.applicableTo}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>
                          {promo.usedCount || 0} / {promo.maxUses === 0 ? '∞' : promo.maxUses}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {promo.validTill ? new Date(promo.validTill.seconds * 1000).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '50px',
                          backgroundColor: status === 'active' ? '#DCFCE7' : status === 'expired' ? '#F3F4F6' : '#FEE2E2',
                          color: status === 'active' ? '#16A34A' : status === 'expired' ? '#6B7280' : '#EF4444',
                          textTransform: 'uppercase'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ paddingRight: '24px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn edit" onClick={() => handleOpenModal(promo)} title="Edit Promo Code">
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={(e) => handleDelete(promo.id, e)} title="Delete Promo Code">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Usage Analytics Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '32px' }}>
                              <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <TrendingUp style={{ color: 'var(--accent)' }} size={24} />
                                <div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Uses</div>
                                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{promo.usedCount || 0}</div>
                                </div>
                              </div>
                              <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <Calendar style={{ color: 'var(--primary)' }} size={24} />
                                <div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Remaining Uses</div>
                                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                                    {promo.maxUses === 0 ? 'Unlimited' : (promo.maxUses - (promo.usedCount || 0))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 style={{ fontSize: '14px', color: 'var(--primary)', marginBottom: '10px', fontWeight: '700' }}>Recent Usage Analytics</h4>
                              {loadingUsage ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading analytics records...</div>
                              ) : usageRecords.length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
                                  No student has redeemed this code yet.
                                </div>
                              ) : (
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                  <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-secondary)', background: '#F9FAFB' }}>
                                      <th style={{ padding: '8px 16px' }}>Student</th>
                                      <th>Course/Package</th>
                                      <th>Date</th>
                                      <th style={{ textAlign: 'right', paddingRight: '16px' }}>Orig. Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {usageRecords.map((r, index) => (
                                      <tr key={index} style={{ borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                                        <td style={{ padding: '8px 16px', fontWeight: '600' }}>{r.studentName || r.userId}</td>
                                        <td>{r.itemName || r.itemId || 'Access Bundle'}</td>
                                        <td>{r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('en-IN') : '-'}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '16px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                                          ₹{r.amount || 0}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '32px',
            width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ color: '#0D2240', margin: '0 0 24px', fontSize: '20px', fontWeight: '800' }}>
              {editingCode ? 'Edit Promo Code' : 'Create Promo Code'}
            </h2>

            <form onSubmit={handleSave}>
              {/* Promo Code Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Promo Code *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    disabled={!!editingCode}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="e.g. LAUNCH2026"
                    style={{
                      flex: 1, padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none'
                    }}
                  />
                  {!editingCode && (
                    <button
                      type="button"
                      onClick={handleGenerateRandom}
                      style={{
                        padding: '12px 16px', backgroundColor: '#F9F9F9', color: '#0D2240',
                        border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                      }}
                    >
                      Generate Random
                    </button>
                  )}
                </div>
                {code && !editingCode && (
                  <p style={{
                    color: availabilityStatus === 'available' ? '#22C55E' : availabilityStatus === 'exists' ? '#EF4444' : '#888',
                    fontSize: '12px', marginTop: '6px', fontWeight: '600'
                  }}>
                    {availabilityStatus === 'checking' && '⏳ Checking availability...'}
                    {availabilityStatus === 'available' && '✅ Available'}
                    {availabilityStatus === 'exists' && '❌ Already exists — try another code'}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Description (internal note)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Launch promo for June 2026"
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Applies To dropdown */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Applies To *
                </label>
                <select
                  value={applicableTo}
                  onChange={(e) => setApplicableTo(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All Purchases (Courses, Tests, & Packages)</option>
                  <option value="courses">Courses Only</option>
                  <option value="tests">Tests Only</option>
                  <option value="packages">Test Packages Only</option>
                </select>
              </div>

              {/* Max Uses */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Max Uses Limit
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="number"
                    disabled={isUnlimited}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    min="1"
                    placeholder="e.g. 100"
                    style={{
                      width: '120px', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none',
                      backgroundColor: isUnlimited ? '#F3F4F6' : 'white'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Unlimited Uses</span>
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Valid Till
                  </label>
                  <input
                    type="date"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Is Active Toggle */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>Is Promo Code Active</span>
                </label>
              </div>

              {/* Live Preview Box */}
              {code && (
                <div style={{
                  backgroundColor: '#FEF3C7', border: '1px dashed #F5A623', padding: '16px 20px', borderRadius: '12px',
                  marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#92400E' }}>
                    🎉 Code: {code}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#B45309' }}>
                    Makes this purchase FREE!
                  </div>
                  <div style={{ fontSize: '12px', color: '#D97706' }}>
                    Valid till: {new Date(validTill).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                  </div>
                </div>
              )}

              {/* Save + Cancel */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={!code || availabilityStatus !== 'available'}
                  style={{
                    flex: 1, padding: '14px',
                    backgroundColor: (!code || availabilityStatus !== 'available') ? '#888' : '#0D2240',
                    color: 'white', border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: '15px',
                    cursor: (!code || availabilityStatus !== 'available') ? 'not-allowed' : 'pointer'
                  }}
                >
                  {editingCode ? 'Update Promo Code' : 'Save Promo Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '14px', backgroundColor: 'white', color: '#888', border: '1px solid #E5E5E5',
                    borderRadius: '50px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
