import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, ListCollapse, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function TestsManagement() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Test modal states
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testFormData, setTestFormData] = useState({
    title: '',
    category: 'school',
    duration: 60,
    totalMarks: 100,
    negativeMarking: 0,
    isFree: false,
    status: 'draft',
    order: 1
  });

  // Questions Manager states
  const [activeTest, setActiveTest] = useState(null); // If not null, shows question manager view
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A', // A, B, C, or D
    explanation: '',
    subject: '',
    difficulty: 'medium',
    marks: 1
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'tests'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      // Fallback
      try {
        const snap = await getDocs(collection(db, 'tests'));
        setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const handleOpenTestModal = (test = null) => {
    if (test) {
      setEditingTest(test);
      setTestFormData({
        title: test.title || '',
        category: test.category || 'school',
        duration: test.duration || 60,
        totalMarks: test.totalMarks || 100,
        negativeMarking: test.negativeMarking || 0,
        isFree: test.isFree || false,
        status: test.status || 'draft',
        order: test.order || 1
      });
    } else {
      setEditingTest(null);
      setTestFormData({
        title: '', category: 'school', duration: 60, totalMarks: 100,
        negativeMarking: 0, isFree: false, status: 'draft', order: tests.length + 1
      });
    }
    setShowTestForm(true);
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    const testData = {
      ...testFormData,
      duration: Number(testFormData.duration),
      totalMarks: Number(testFormData.totalMarks),
      negativeMarking: Number(testFormData.negativeMarking),
      order: Number(testFormData.order)
    };

    try {
      if (editingTest) {
        await updateDoc(doc(db, 'tests', editingTest.id), testData);
      } else {
        await addDoc(collection(db, 'tests'), testData);
      }
      setShowTestForm(false);
      loadTests();
    } catch (err) {
      alert("Error saving test: " + err.message);
    }
  };

  const handleTestDelete = async (id, title) => {
    if (!window.confirm(`Delete test "${title}"? This will not delete its questions but it will detach them.`)) return;
    try {
      await deleteDoc(doc(db, 'tests', id));
      loadTests();
    } catch (e) {
      alert("Error deleting test: " + e.message);
    }
  };

  // Questions Management Logic
  const handleManageQuestions = async (test) => {
    setActiveTest(test);
    setLoadingQuestions(true);
    setShowQuestionForm(false);
    try {
      const q = query(collection(db, 'questions'), where('testId', '==', test.id));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error loading questions:", e);
    }
    setLoadingQuestions(false);
  };

  const handleOpenQuestionModal = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionFormData({
        questionText: question.questionText || '',
        optionA: question.optionA || '',
        optionB: question.optionB || '',
        optionC: question.optionC || '',
        optionD: question.optionD || '',
        correctOption: question.correctOption || 'A',
        explanation: question.explanation || '',
        subject: question.subject || '',
        difficulty: question.difficulty || 'medium',
        marks: question.marks || 1
      });
    } else {
      setEditingQuestion(null);
      setQuestionFormData({
        questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
        correctOption: 'A', explanation: '', subject: activeTest.subject || '',
        difficulty: 'medium', marks: 1
      });
    }
    setShowQuestionForm(true);
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    const questionData = {
      ...questionFormData,
      testId: activeTest.id,
      marks: Number(questionFormData.marks)
    };

    try {
      if (editingQuestion) {
        await updateDoc(doc(db, 'questions', editingQuestion.id), questionData);
      } else {
        await addDoc(collection(db, 'questions'), questionData);
      }
      setShowQuestionForm(false);
      // Reload questions
      handleManageQuestions(activeTest);
    } catch (err) {
      alert("Error saving question: " + err.message);
    }
  };

  const handleQuestionDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      handleManageQuestions(activeTest);
    } catch (e) {
      alert("Error deleting question: " + e.message);
    }
  };

  const statusColors = {
    active: '#22C55E',
    coming_soon: '#F5A623',
    draft: '#888888'
  };

  if (activeTest) {
    // QUESTION MANAGER SUB-VIEW
    return (
      <div className="management-container">
        <div className="management-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="secondary-button" onClick={() => { setActiveTest(null); loadTests(); }} style={{ padding: '8px' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2>Questions: {activeTest.title}</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
                {questions.length} questions added to this test.
              </p>
            </div>
          </div>
          <button className="primary-button" onClick={() => handleOpenQuestionModal()}>
            <Plus size={18} />
            <span>Add Question</span>
          </button>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          {loadingQuestions ? (
            <div className="loading-state">Loading questions...</div>
          ) : questions.length > 0 ? (
            questions.map((q, idx) => (
              <div key={q.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>Question {idx + 1} ({q.marks} Mark{q.marks > 1 ? 's' : ''})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                      {q.difficulty}
                    </span>
                    <button className="icon-btn edit" onClick={() => handleOpenQuestionModal(q)} title="Edit Question">
                      <Edit2 size={15} />
                    </button>
                    <button className="icon-btn delete" onClick={() => handleQuestionDelete(q.id)} title="Delete Question">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: '12px 0 16px 0', fontSize: '15px' }}>
                  {q.questionText}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  {[
                    { key: 'A', val: q.optionA },
                    { key: 'B', val: q.optionB },
                    { key: 'C', val: q.optionC },
                    { key: 'D', val: q.optionD }
                  ].map(opt => {
                    const isCorrect = q.correctOption === opt.key;
                    return (
                      <div key={opt.key} style={{
                        padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                        backgroundColor: isCorrect ? 'var(--success)20' : 'var(--bg-input)',
                        color: isCorrect ? 'var(--success)' : 'var(--text-primary)',
                        fontWeight: isCorrect ? '600' : 'normal'
                      }}>
                        <strong>{opt.key}.</strong> {opt.val}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: '#F8FAFC', borderRadius: 'var(--radius-md)', fontSize: '13px', borderLeft: '3px solid var(--accent)' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="table-container" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No questions added to this test yet. Click "+ Add Question" to begin.
            </div>
          )}
        </div>

        {/* ADD/EDIT QUESTION MODAL */}
        {showQuestionForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <h3>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h3>
                <button className="close-btn" onClick={() => setShowQuestionForm(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleQuestionSubmit} className="modal-form" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>Question Text *</label>
                  <textarea required rows="3" value={questionFormData.questionText} onChange={e => setQuestionFormData({ ...questionFormData, questionText: e.target.value })} placeholder="Type question content here..."></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Option A *</label>
                    <input required value={questionFormData.optionA} onChange={e => setQuestionFormData({ ...questionFormData, optionA: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Option B *</label>
                    <input required value={questionFormData.optionB} onChange={e => setQuestionFormData({ ...questionFormData, optionB: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Option C *</label>
                    <input required value={questionFormData.optionC} onChange={e => setQuestionFormData({ ...questionFormData, optionC: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Option D *</label>
                    <input required value={questionFormData.optionD} onChange={e => setQuestionFormData({ ...questionFormData, optionD: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Correct Option *</label>
                    <div style={{ display: 'flex', gap: '16px', height: '42px', alignItems: 'center' }}>
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700' }}>
                          <input type="radio" name="correctOption" checked={questionFormData.correctOption === opt} onChange={() => setQuestionFormData({ ...questionFormData, correctOption: opt })} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Marks</label>
                    <input type="number" min="1" value={questionFormData.marks} onChange={e => setQuestionFormData({ ...questionFormData, marks: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Explanation</label>
                  <textarea rows="2" value={questionFormData.explanation} onChange={e => setQuestionFormData({ ...questionFormData, explanation: e.target.value })} placeholder="Explanation for correct answer..."></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Subject</label>
                    <input value={questionFormData.subject} onChange={e => setQuestionFormData({ ...questionFormData, subject: e.target.value })} placeholder="e.g. Chemistry" />
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select value={questionFormData.difficulty} onChange={e => setQuestionFormData({ ...questionFormData, difficulty: e.target.value })}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                  <button type="button" className="secondary-button" onClick={() => setShowQuestionForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    <span>{editingQuestion ? 'Update Question' : 'Add Question'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD TESTS MANAGER LIST
  return (
    <div className="management-container">
      <div className="management-header">
        <div>
          <h2>Tests Configuration</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Configure examination modules and question papers.
          </p>
        </div>
        <button className="primary-button" onClick={() => handleOpenTestModal()}>
          <Plus size={18} />
          <span>Create New Test</span>
        </button>
      </div>

      <div className="table-container" style={{ marginTop: '24px' }}>
        {loading ? (
          <div className="loading-state">Loading tests...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Title</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Total Marks</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.length > 0 ? (
                tests.map(test => (
                  <tr key={test.id}>
                    <td className="font-medium">{test.title}</td>
                    <td><span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)' }}>{test.category}</span></td>
                    <td>{test.duration} minutes</td>
                    <td>{test.totalMarks} Marks</td>
                    <td>{test.order}</td>
                    <td>
                      <span style={{
                        backgroundColor: (statusColors[test.status] || '#888') + '20',
                        color: statusColors[test.status] || '#888',
                        padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {test.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="icon-btn edit" onClick={() => handleManageQuestions(test)} title="Manage Questions">
                        <ListCollapse size={16} />
                      </button>
                      <button className="icon-btn edit" onClick={() => handleOpenTestModal(test)} title="Edit Configuration">
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => handleTestDelete(test.id, test.title)} title="Delete Test">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">No tests created yet. Click "Create New Test" to begin!</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD/EDIT TEST CONFIG MODAL */}
      {showTestForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingTest ? 'Edit Test Config' : 'Create New Test'}</h3>
              <button className="close-btn" onClick={() => setShowTestForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTestSubmit} className="modal-form">
              <div className="form-group">
                <label>Test Title *</label>
                <input required value={testFormData.title} onChange={e => setTestFormData({ ...testFormData, title: e.target.value })} placeholder="e.g. Physics Mock Test 1" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={testFormData.category} onChange={e => setTestFormData({ ...testFormData, category: e.target.value })}>
                    <option value="school">School (VI-X)</option>
                    <option value="senior">Senior (XI-XII)</option>
                    <option value="govt">Govt Jobs</option>
                    <option value="cuet">CUET 2026</option>
                    <option value="jee">JEE</option>
                    <option value="neet">NEET</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={testFormData.status} onChange={e => setTestFormData({ ...testFormData, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input type="number" value={testFormData.duration} onChange={e => setTestFormData({ ...testFormData, duration: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Total Marks</label>
                  <input type="number" value={testFormData.totalMarks} onChange={e => setTestFormData({ ...testFormData, totalMarks: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Negative Marks/Wrong Answer</label>
                  <input type="number" step="0.1" value={testFormData.negativeMarking} onChange={e => setTestFormData({ ...testFormData, negativeMarking: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Sorting Order</label>
                  <input type="number" value={testFormData.order} onChange={e => setTestFormData({ ...testFormData, order: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>
                  <input type="checkbox" checked={testFormData.isFree} onChange={e => setTestFormData({ ...testFormData, isFree: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                  Is Free Test
                </label>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowTestForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <CheckCircle2 size={18} />
                  <span>{editingTest ? 'Update Test' : 'Create Test'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
