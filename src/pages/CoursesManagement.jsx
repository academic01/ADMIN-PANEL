import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, deleteDoc, doc,
  serverTimestamp, orderBy, query
} from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Search, CheckCircle2 } from 'lucide-react';

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'school',
    examType: '',
    subject: '',
    facultyName: '',
    description: '',
    shortDescription: '',
    price: 0,
    originalPrice: 0,
    isFree: false,
    status: 'active',
    isFeatured: false,
    isBestseller: false,
    isNew: true,
    totalVideos: 0,
    language: 'Hindi + English',
    tags: ''
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id, ...d.data()
      }));
      setCourses(data);
    } catch (e) {
      console.error(e);
      // Fallback if index on createdAt is missing initially
      try {
        const snapshot = await getDocs(collection(db, 'courses'));
        const data = snapshot.docs.map(d => ({
          id: d.id, ...d.data()
        }));
        setCourses(data);
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const courseData = {
      ...formData,
      price: Number(formData.price),
      originalPrice: Number(formData.originalPrice),
      totalVideos: Number(formData.totalVideos),
      discountPercent: formData.originalPrice > 0
        ? Math.round((1 - formData.price / formData.originalPrice) * 100)
        : 0,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      rating: editingCourse ? editingCourse.rating : 0,
      totalEnrollments: editingCourse ? editingCourse.totalEnrollments : 0,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
      } else {
        courseData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'courses'), courseData);
      }
      
      setShowForm(false);
      setEditingCourse(null);
      resetForm();
      loadCourses();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleDelete = async (courseId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      loadCourses();
    } catch (e) {
      alert('Error deleting: ' + e.message);
    }
  };

  const toggleStatus = async (course) => {
    const newStatus = course.status === 'active' ? 'draft' : 'active';
    try {
      await updateDoc(doc(db, 'courses', course.id), { status: newStatus });
      loadCourses();
    } catch (e) {
      alert('Error toggling status: ' + e.message);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      ...course,
      tags: course.tags?.join(', ') || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', category: 'school', examType: '', subject: '', facultyName: '',
      description: '', shortDescription: '', price: 0, originalPrice: 0,
      isFree: false, status: 'active', isFeatured: false, isBestseller: false,
      isNew: true, totalVideos: 0, language: 'Hindi + English', tags: ''
    });
  };

  const categoryColors = {
    school: '#0D2240', senior: '#7C3AED', govt: '#16A34A',
    cuet: '#7C3AED', jee: '#888888', neet: '#888888'
  };

  const statusColors = {
    active: '#22C55E', coming_soon: '#F5A623',
    draft: '#888888', archived: '#EF4444'
  };

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.facultyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <h2>Courses Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {courses.length} total courses
          </p>
        </div>
        <button className="primary-button" onClick={() => {
          resetForm();
          setEditingCourse(null);
          setShowForm(true);
        }}>
          <Plus size={18} />
          <span>Add New Course</span>
        </button>
      </div>

      <div className="management-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search courses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading courses...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Category</th>
                <th>Price</th>
                <th>Enrollments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="font-medium">{course.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        {course.facultyName} • {course.totalVideos} videos
                      </div>
                    </td>
                    <td>
                      <span style={{
                        backgroundColor: (categoryColors[course.category] || '#888') + '20',
                        color: categoryColors[course.category] || '#888',
                        padding: '6px 12px',
                        borderRadius: '50px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {course.category?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {course.isFree ? (
                        <span style={{ color: 'var(--success)', fontWeight: '700' }}>FREE</span>
                      ) : (
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                            ₹{course.price}
                          </div>
                          {course.originalPrice > 0 && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'line-through' }}>
                              ₹{course.originalPrice}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="font-medium">
                      {course.totalEnrollments || 0}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleStatus(course)}
                        style={{
                          backgroundColor: (statusColors[course.status] || '#888') + '20',
                          color: statusColors[course.status] || '#888',
                          padding: '6px 12px',
                          borderRadius: '50px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        {course.status?.replace('_', ' ').toUpperCase()}
                      </button>
                    </td>
                    <td className="actions-cell">
                      <button className="icon-btn edit" onClick={() => handleEdit(course)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => handleDelete(course.id, course.title)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No courses found. Add your first course!</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD/EDIT COURSE MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              
              <div className="form-group">
                <label>Course Title *</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. CUET 2026 Complete Prep" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="school">School (VI-X)</option>
                    <option value="senior">Senior (XI-XII)</option>
                    <option value="govt">Govt Jobs</option>
                    <option value="cuet">CUET 2026</option>
                    <option value="jee">JEE (Coming Soon)</option>
                    <option value="neet">NEET (Coming Soon)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Exam Type</label>
                  <input value={formData.examType} onChange={e => setFormData({...formData, examType: e.target.value})} placeholder="e.g. CUET" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Faculty Name</label>
                  <input value={formData.facultyName} onChange={e => setFormData({...formData, facultyName: e.target.value})} placeholder="e.g. Kishan Sharma" />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Mathematics" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Original Price (₹)</label>
                  <input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Short Description</label>
                <input value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} placeholder="One line description" />
              </div>

              <div className="form-group">
                <label>Full Description</label>
                <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed course description"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Total Videos</label>
                  <input type="number" value={formData.totalVideos} onChange={e => setFormData({...formData, totalVideos: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="cuet, 2026, entrance" />
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
                {[
                  ['isFree', 'Free Course'],
                  ['isFeatured', 'Featured'],
                  ['isBestseller', 'Bestseller'],
                  ['isNew', 'Show NEW Badge']
                ].map(([key, label]) => (
                  <label key={key} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData[key]}
                      onChange={e => setFormData({...formData, [key]: e.target.checked})}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <CheckCircle2 size={18} />
                  <span>{editingCourse ? 'Update Course' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
