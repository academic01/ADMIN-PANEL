import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { Package, Plus, Trash2, Edit2, Eye, Search, Layers, Calendar, CheckCircle } from 'lucide-react';

export default function TestPackages() {
  const [packages, setPackages] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Test Selection Filter in Modal
  const [modalTestSearch, setModalTestSearch] = useState('');
  const [modalTestCategory, setModalTestCategory] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  // View Tests Overlay State
  const [viewingPackageTests, setViewingPackageTests] = useState(null); // package object when viewing

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [price, setPrice] = useState(100);
  const [originalPrice, setOriginalPrice] = useState(299);
  const [validityDays, setValidityDays] = useState(365);
  const [badge, setBadge] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Listen to testPackages
    const q = query(collection(db, 'testPackages'), orderBy('createdAt', 'desc'));
    const unsubPackages = onSnapshot(q, (snap) => {
      setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    // Load active tests for checkboxes
    const testsQuery = query(collection(db, 'tests'));
    const unsubTests = onSnapshot(testsQuery, (snap) => {
      setAllTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPackages();
      unsubTests();
    };
  }, []);

  const handleOpenModal = (pack = null) => {
    if (pack) {
      setEditingPackage(pack);
      setTitle(pack.title || '');
      setDescription(pack.description || '');
      setCategory(pack.category || 'all');
      setSelectedTestIds(pack.tests || []);
      setPrice(pack.price || 0);
      setOriginalPrice(pack.originalPrice || 0);
      setValidityDays(pack.validityDays || 365);
      setBadge(pack.badge || '');
      setIsFeatured(pack.isFeatured || false);
      setIsActive(pack.isActive !== false);
    } else {
      setEditingPackage(null);
      setTitle('');
      setDescription('');
      setCategory('all');
      setSelectedTestIds([]);
      setPrice(100);
      setOriginalPrice(299);
      setValidityDays(365);
      setBadge('');
      setIsFeatured(false);
      setIsActive(true);
    }
    setModalTestSearch('');
    setModalTestCategory('all');
    setShowModal(true);
  };

  const handleTestCheckboxChange = (testId) => {
    setSelectedTestIds(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const calculateDiscount = () => {
    if (!originalPrice || originalPrice <= price) return null;
    const diff = originalPrice - price;
    const percent = Math.round((diff / originalPrice) * 100);
    return `${percent}% OFF`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Package title is required!");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      tests: selectedTestIds,
      totalTests: selectedTestIds.length,
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || 0,
      validityDays: Number(validityDays) || 365,
      badge,
      isFeatured,
      isActive,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingPackage) {
        await updateDoc(doc(db, 'testPackages', editingPackage.id), payload);
      } else {
        await addDoc(collection(db, 'testPackages'), {
          ...payload,
          totalPurchases: 0,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this test package?")) {
      try {
        await deleteDoc(doc(db, 'testPackages', id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Filter package items for search and category
  const filteredPackages = packages.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter tests in modal
  const filteredModalTests = allTests.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(modalTestSearch.toLowerCase());
    const matchesCategory = modalTestCategory === 'all' || t.category === modalTestCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>📦 Test Packages</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Create bundled test series packages with pricing, validity periods, and custom badges.
          </p>
        </div>
        <button className="primary-button" onClick={() => handleOpenModal()} style={{ backgroundColor: '#F5A623', color: '#0D2240' }}>
          <Plus size={18} />
          <span>Create Package</span>
        </button>
      </div>

      {/* Search & Filtering Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search test packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '48px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="all">All Categories</option>
          <option value="school">School (VI-X)</option>
          <option value="boards">Boards (XI-XII)</option>
          <option value="govt">Govt Jobs</option>
          <option value="cuet">CUET 2026</option>
        </select>
      </div>

      {/* Grid of Packages */}
      {loading ? (
        <div className="loading-state">Loading packages...</div>
      ) : filteredPackages.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
          <Package size={48} style={{ color: '#DDD', marginBottom: '16px' }} />
          <h3>No Test Packages found</h3>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first mock test bundle to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '24px' }}>
          {filteredPackages.map(pack => {
            const discountBadge = pack.originalPrice > pack.price 
              ? Math.round(((pack.originalPrice - pack.price) / pack.originalPrice) * 100) 
              : 0;

            return (
              <div key={pack.id} style={{
                backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-light)',
                padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', position: 'relative'
              }}>
                {/* Featured Badge */}
                {pack.isFeatured && (
                  <span style={{
                    position: 'absolute', top: '16px', right: '16px', backgroundColor: '#FEF3C7', color: '#D97706',
                    fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FCD34D'
                  }}>
                    FEATURED
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      backgroundColor: 'var(--primary)15', color: 'var(--primary)',
                      fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase'
                    }}>
                      {pack.category}
                    </span>
                    {pack.badge && (
                      <span style={{
                        backgroundColor: '#EF444415', color: '#EF4444',
                        fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px'
                      }}>
                        🔥 {pack.badge}
                      </span>
                    )}
                    <span style={{
                      backgroundColor: pack.isActive ? '#DCFCE7' : '#FEE2E2',
                      color: pack.isActive ? '#16A34A' : '#EF4444',
                      fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px'
                    }}>
                      {pack.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <h3 style={{ color: '#0D2240', fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0' }}>
                    {pack.title}
                  </h3>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.5', height: '3.0em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pack.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} />
                      {pack.totalTests || 0} Mock Tests
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} />
                      {pack.validityDays} Days Access
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#888' }}>
                      👤 {pack.totalPurchases || 0} Purchases
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                      ₹{pack.price}
                    </span>
                    {pack.originalPrice > pack.price && (
                      <>
                        <span style={{ fontSize: '14px', textDecoration: 'line-through', color: '#888', marginLeft: '8px' }}>
                          ₹{pack.originalPrice}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A', marginLeft: '6px' }}>
                          ({discountBadge}% OFF)
                        </span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setViewingPackageTests(pack)}
                      className="secondary-button"
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                      title="View tests included"
                    >
                      <Eye size={14} />
                      <span>Tests</span>
                    </button>
                    <button
                      onClick={() => handleOpenModal(pack)}
                      className="secondary-button"
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(pack.id)}
                      className="secondary-button"
                      style={{ padding: '8px 12px', color: 'var(--error)', border: '1px solid var(--error)40', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '32px',
            width: '720px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ color: '#0D2240', margin: '0 0 24px', fontSize: '20px', fontWeight: '800' }}>
              {editingPackage ? 'Edit Test Package' : 'Create Test Package'}
            </h2>

            <form onSubmit={handleSave}>
              {/* Package Title */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Package Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SSC CGL 2026 Premium Mock Series"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain what's included in this package..."
                  rows="3"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', height: 'auto', resize: 'vertical' }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="school">School (VI-X)</option>
                  <option value="boards">Boards (XI-XII)</option>
                  <option value="govt">Govt Jobs</option>
                  <option value="cuet">CUET 2026</option>
                  <option value="all">All Categories</option>
                </select>
              </div>

              {/* Select Tests Checkbox list */}
              <div style={{ border: '1px solid #E5E5E5', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ color: '#444', fontSize: '14px', fontWeight: '700' }}>
                    Select Included Tests ({selectedTestIds.length} selected)
                  </label>
                  
                  {/* Internal search/filter inside select tests container */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Filter tests..."
                      value={modalTestSearch}
                      onChange={(e) => setModalTestSearch(e.target.value)}
                      style={{ padding: '6px 12px', fontSize: '12px', width: '150px' }}
                    />
                    <select
                      value={modalTestCategory}
                      onChange={(e) => setModalTestCategory(e.target.value)}
                      style={{ padding: '6px 12px', fontSize: '12px', width: '120px' }}
                    >
                      <option value="all">All</option>
                      <option value="school">School</option>
                      <option value="boards">Boards</option>
                      <option value="govt">Govt</option>
                      <option value="cuet">CUET</option>
                    </select>
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #EEE', paddingTop: '12px' }}>
                  {filteredModalTests.length === 0 ? (
                    <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
                      No active tests found matching criteria.
                    </div>
                  ) : (
                    filteredModalTests.map(test => (
                      <label key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.2s', hover: { backgroundColor: '#F9F9F9' } }}>
                        <input
                          type="checkbox"
                          checked={selectedTestIds.includes(test.id)}
                          onChange={() => handleTestCheckboxChange(test.id)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>{test.title}</span>
                          <span style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                            {test.category} | {test.duration} min
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Price & Original Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Sale Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    placeholder="e.g. 100"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Original Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    min="0"
                    placeholder="e.g. 299"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {calculateDiscount() && (
                    <span style={{ color: '#16A34A', fontSize: '12px', fontWeight: '700', marginTop: '4px', display: 'block' }}>
                      🔥 Discount Calculation: {calculateDiscount()}
                    </span>
                  )}
                </div>
              </div>

              {/* Validity in Days & Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Validity (days) *
                  </label>
                  <input
                    type="number"
                    required
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    min="1"
                    placeholder="e.g. 365"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#444', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Display Badge (Optional)
                  </label>
                  <select
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">None</option>
                    <option value="BESTSELLER">Bestseller</option>
                    <option value="NEW">New Package</option>
                    <option value="HOT">Hot Deal</option>
                    <option value="RECOMMENDED">Recommended</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>Featured Package</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>Is Package Active</span>
                </label>
              </div>

              {/* Save + Cancel */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '14px', backgroundColor: '#0D2240', color: 'white',
                    border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: '15px', cursor: 'pointer'
                  }}
                >
                  Save Package
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

      {/* VIEW TESTS OVERLAY */}
      {viewingPackageTests && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '32px',
            width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3 style={{ color: '#0D2240', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>
              Tests inside {viewingPackageTests.title}
            </h3>
            <p style={{ color: '#888', fontSize: '13px', margin: '0 0 20px 0' }}>
              Students buying this package will get access to the following tests:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {viewingPackageTests.tests && viewingPackageTests.tests.length > 0 ? (
                viewingPackageTests.tests.map(testId => {
                  const testObj = allTests.find(t => t.id === testId);
                  return (
                    <div key={testId} style={{
                      padding: '12px 16px', border: '1px solid var(--border-light)', borderRadius: '8px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} style={{ color: '#16A34A' }} />
                        <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--primary)' }}>
                          {testObj ? testObj.title : `Test ID: ${testId}`}
                        </span>
                      </div>
                      {testObj && (
                        <span style={{ fontSize: '11px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                          {testObj.duration} min
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#888', fontSize: '13px', fontStyle: 'italic', padding: '16px', textAlign: 'center' }}>
                  No tests added to this package bundle yet.
                </div>
              )}
            </div>

            <button
              onClick={() => setViewingPackageTests(null)}
              style={{
                width: '100%', padding: '12px', backgroundColor: '#0D2240', color: 'white',
                border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
