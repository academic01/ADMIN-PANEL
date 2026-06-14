import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, doc, getDoc, updateDoc, deleteDoc, addDoc, 
  query, where, orderBy, onSnapshot, increment, serverTimestamp 
} from 'firebase/firestore';
import { ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical, Play, Info, Video, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export default function CourseVideos({ courseId, courseTitle, setPage }) {
  const [chapters, setChapters] = useState({});
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);

  // Expanded Accordions State (chapterTitle -> boolean)
  const [expandedChapters, setExpandedChapters] = useState({});

  // Chapter Modal
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterModalTitle, setChapterModalTitle] = useState('');
  const [editingChapterOldName, setEditingChapterOldName] = useState(null);

  // Video Modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    chapterTitle: '',
    description: '',
    videoUrl: '',
    duration: '',
    order: 1,
    isFree: false,
    isLocked: true
  });

  // Inline "Add New Chapter" inside video form helper
  const [showInlineChapterInput, setShowInlineChapterInput] = useState(false);
  const [inlineChapterName, setInlineChapterName] = useState('');

  useEffect(() => {
    if (!courseId) return;

    setLoading(true);
    const q = query(
      collection(db, 'videos'),
      where('courseId', '==', courseId),
      orderBy('chapterIndex', 'asc'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Group by chapterTitle
      const grouped = {};
      videoDocs.forEach(v => {
        const ch = v.chapterTitle || 'Uncategorized';
        if (!grouped[ch]) grouped[ch] = [];
        grouped[ch].push(v);
      });

      setChapters(grouped);
      setTotalVideos(videoDocs.length);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching videos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  // Extract YouTube ID Helper
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const handleToggleChapter = (chapterTitle) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterTitle]: !prev[chapterTitle]
    }));
  };

  // Chapter CRUD
  const handleOpenChapterModal = (oldName = null) => {
    if (oldName) {
      setEditingChapterOldName(oldName);
      setChapterModalTitle(oldName);
    } else {
      setEditingChapterOldName(null);
      setChapterModalTitle('');
    }
    setShowChapterModal(true);
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    const newName = chapterModalTitle.trim();
    if (!newName) return;

    try {
      if (editingChapterOldName) {
        // Edit Chapter Name: Rename chapterTitle in all associated videos
        const videosInCh = chapters[editingChapterOldName] || [];
        await Promise.all(
          videosInCh.map(async (vid) => {
            await updateDoc(doc(db, 'videos', vid.id), {
              chapterTitle: newName
            });
          })
        );
        alert("Chapter renamed successfully!");
      } else {
        // Add Chapter: Just initialize key in local state with empty array so UI registers it
        setChapters(prev => ({
          ...prev,
          [newName]: prev[newName] || []
        }));
        setExpandedChapters(prev => ({ ...prev, [newName]: true }));
        alert("Chapter added! You can now add videos to it.");
      }
      setShowChapterModal(false);
    } catch (err) {
      alert("Error saving chapter: " + err.message);
    }
  };

  const handleChapterDelete = async (chapterTitle) => {
    const videosInCh = chapters[chapterTitle] || [];
    if (videosInCh.length > 0) {
      alert("Cannot delete a chapter containing videos. Please delete or move all videos first.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete chapter "${chapterTitle}"?`)) {
      setChapters(prev => {
        const copy = { ...prev };
        delete copy[chapterTitle];
        return copy;
      });
    }
  };

  // Video CRUD
  const handleOpenVideoModal = (video = null, defaultChapter = '') => {
    if (video) {
      setEditingVideo(video);
      setVideoFormData({
        title: video.title || '',
        chapterTitle: video.chapterTitle || '',
        description: video.description || '',
        videoUrl: video.videoUrl || '',
        duration: video.duration || '',
        order: video.order || 1,
        isFree: video.isFree || false,
        isLocked: video.isLocked !== false
      });
    } else {
      // Find default chapter if possible
      const chaptersList = Object.keys(chapters);
      const initialChapter = defaultChapter || chaptersList[0] || '';
      
      setEditingVideo(null);
      setVideoFormData({
        title: '',
        chapterTitle: initialChapter,
        description: '',
        videoUrl: '',
        duration: '',
        order: (chapters[initialChapter]?.length || 0) + 1,
        isFree: false,
        isLocked: true
      });
    }
    setShowInlineChapterInput(false);
    setShowVideoModal(true);
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();

    let targetChapter = videoFormData.chapterTitle;
    
    // Inline chapter creation handler
    if (showInlineChapterInput && inlineChapterName.trim()) {
      targetChapter = inlineChapterName.trim();
      setChapters(prev => ({ ...prev, [targetChapter]: prev[targetChapter] || [] }));
    }

    if (!targetChapter) {
      alert("Please select or specify a chapter.");
      return;
    }

    const chaptersArray = Object.keys(chapters);
    let chIndex = chaptersArray.indexOf(targetChapter);
    if (chIndex === -1) {
      chIndex = chaptersArray.length;
    }

    const videoData = {
      courseId,
      chapterTitle: targetChapter,
      chapterIndex: chIndex,
      title: videoFormData.title.trim(),
      description: videoFormData.description.trim(),
      videoUrl: videoFormData.videoUrl.trim(),
      duration: Number(videoFormData.duration) || 0,
      order: Number(videoFormData.order) || 1,
      isFree: videoFormData.isFree,
      isLocked: !videoFormData.isFree, // Mutual exclusion
      views: editingVideo ? (editingVideo.views || 0) : 0,
      createdAt: editingVideo ? (editingVideo.createdAt || serverTimestamp()) : serverTimestamp()
    };

    try {
      if (editingVideo) {
        await updateDoc(doc(db, 'videos', editingVideo.id), videoData);
        alert("Video updated!");
      } else {
        await addDoc(collection(db, 'videos'), videoData);
        // Increment course totalVideos count
        await updateDoc(doc(db, 'courses', courseId), {
          totalVideos: increment(1)
        });
        alert("Video added to course!");
      }
      setShowVideoModal(false);
    } catch (err) {
      alert("Error saving video: " + err.message);
    }
  };

  const handleVideoDelete = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'videos', videoId));
      // Decrement course totalVideos count
      await updateDoc(doc(db, 'courses', courseId), {
        totalVideos: increment(-1)
      });
      alert("Video deleted.");
    } catch (err) {
      alert("Error deleting video: " + err.message);
    }
  };

  const ytId = getYouTubeId(videoFormData.videoUrl);
  const ytThumb = getYouTubeThumbnail(videoFormData.videoUrl);
  const chapterKeys = Object.keys(chapters);

  return (
    <div className="management-container">
      {/* Header */}
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="secondary-button" onClick={() => setPage('courses')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2>📹 Videos — {courseTitle}</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
              {totalVideos} videos across {chapterKeys.length} chapters
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-button" onClick={() => handleOpenChapterModal()} style={{ backgroundColor: '#F5A623', color: '#0D2240' }}>
            <Plus size={18} />
            <span>Add Chapter</span>
          </button>
          <button className="primary-button" onClick={() => handleOpenVideoModal()}>
            <Plus size={18} />
            <span>Add Video</span>
          </button>
        </div>
      </div>

      {/* Chapters list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {loading ? (
          <div className="loading-state">Loading video configuration...</div>
        ) : chapterKeys.length > 0 ? (
          chapterKeys.map((chapterTitle) => {
            const vids = chapters[chapterTitle] || [];
            const isExpanded = expandedChapters[chapterTitle] !== false;

            return (
              <div key={chapterTitle} style={{
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-card)', overflow: 'hidden'
              }}>
                {/* Chapter Accordion Header */}
                <div style={{
                  padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-input)', borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                  cursor: 'pointer'
                }} onClick={() => handleToggleChapter(chapterTitle)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>{chapterTitle}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                      {vids.length} Video{vids.length !== 1 ? 's' : ''}
                    </span>
                    <button className="icon-btn edit" onClick={() => handleOpenChapterModal(chapterTitle)} title="Rename Chapter" style={{ padding: '4px' }}>
                      <Edit2 size={14} />
                    </button>
                    {vids.length === 0 && (
                      <button className="icon-btn delete" onClick={() => handleChapterDelete(chapterTitle)} title="Delete Chapter" style={{ padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Chapter Videos List */}
                {isExpanded && (
                  <div style={{ padding: '0' }}>
                    {vids.length > 0 ? (
                      <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <tbody>
                          {vids.map((video, idx) => (
                            <tr key={video.id}>
                              <td style={{ width: '40px', paddingLeft: '24px', paddingRight: '0', color: 'var(--text-secondary)' }}>
                                <GripVertical size={16} style={{ cursor: 'grab' }} />
                              </td>
                              <td style={{ width: '40px', paddingLeft: '8px', paddingRight: '0', fontWeight: '700', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {idx + 1}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <div style={{
                                    width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-main)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                                  }}>
                                    <Play size={16} fill="currentColor" />
                                  </div>
                                  <div>
                                    <div className="font-medium" style={{ fontSize: '14px' }}>{video.title}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {video.description || 'No description provided'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 8px', background: 'var(--bg-main)', borderRadius: '4px' }}>
                                  ⏱ {video.duration} min
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {video.isFree ? (
                                    <span style={{ backgroundColor: 'var(--success)20', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                      FREE PREVIEW
                                    </span>
                                  ) : (
                                    <span style={{ backgroundColor: 'var(--primary)20', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                      LOCKED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="actions-cell" style={{ paddingRight: '24px' }}>
                                <button className="icon-btn edit" onClick={() => handleOpenVideoModal(video)} title="Edit Video">
                                  <Edit2 size={16} />
                                </button>
                                <button className="icon-btn delete" onClick={() => handleVideoDelete(video.id)} title="Delete Video">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        No videos in this chapter. Click "+ Add Video" to include content.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="table-container" style={{ padding: '64px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Video size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--primary)' }}>No content yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Add your first chapter to get started building this course structure.
              </p>
            </div>
            <button className="primary-button" onClick={() => handleOpenChapterModal()} style={{ marginTop: '8px' }}>
              <Plus size={18} />
              <span>Add First Chapter</span>
            </button>
          </div>
        )}
      </div>

      {/* CHAPTER MODAL */}
      {showChapterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{editingChapterOldName ? 'Rename Chapter' : 'Add Chapter'}</h3>
              <button className="close-btn" onClick={() => setShowChapterModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChapterSubmit} className="modal-form">
              <div className="form-group">
                <label>Chapter Title *</label>
                <input
                  required
                  value={chapterModalTitle}
                  onChange={e => setChapterModalTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Introduction"
                />
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', margin: '0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowChapterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <span>Save Chapter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingVideo ? 'Edit Video Details' : 'Add Video to Course'}</h3>
              <button className="close-btn" onClick={() => setShowVideoModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleVideoSubmit} className="modal-form" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              
              {/* SECTION 1 — Basic Info */}
              <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>Section 1: Basic Info</h4>
                
                <div className="form-group">
                  <label>Video Title *</label>
                  <input
                    required
                    value={videoFormData.title}
                    onChange={e => setVideoFormData({ ...videoFormData, title: e.target.value })}
                    placeholder="e.g. Introduction to Humanities"
                  />
                </div>

                <div className="form-group">
                  <label>Chapter *</label>
                  {!showInlineChapterInput ? (
                    <select
                      value={videoFormData.chapterTitle}
                      onChange={e => {
                        if (e.target.value === '__add_new__') {
                          setShowInlineChapterInput(true);
                        } else {
                          setVideoFormData({ ...videoFormData, chapterTitle: e.target.value });
                        }
                      }}
                      required
                    >
                      <option value="" disabled>Select Chapter</option>
                      {chapterKeys.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                      <option value="__add_new__" style={{ color: 'var(--accent)', fontWeight: '700' }}>+ Add New Chapter</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        required
                        value={inlineChapterName}
                        onChange={e => setInlineChapterName(e.target.value)}
                        placeholder="Type new chapter name..."
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="secondary-button" onClick={() => { setShowInlineChapterInput(false); setInlineChapterName(''); }} style={{ padding: '8px 12px' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    value={videoFormData.description}
                    onChange={e => setVideoFormData({ ...videoFormData, description: e.target.value })}
                    placeholder="Brief note about what this video covers..."
                  ></textarea>
                </div>
              </div>

              {/* SECTION 2 — Video Source */}
              <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>Section 2: Video Source</h4>
                
                <div className="form-group">
                  <label>YouTube Video URL *</label>
                  <input
                    required
                    value={videoFormData.videoUrl}
                    onChange={e => setVideoFormData({ ...videoFormData, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... OR https://youtu.be/..."
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Paste any YouTube link — watch, live, or short URL. The app will convert it automatically.
                  </p>
                </div>

                {/* URL Preview */}
                {videoFormData.videoUrl && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-lg)' }}>
                    {ytThumb ? (
                      <>
                        <img src={ytThumb} width={120} height={68} style={{ borderRadius: '6px', objectFit: 'cover' }} alt="YouTube Preview" />
                        <div>
                          <div style={{ color: 'var(--success)', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} />
                            <span>Valid YouTube URL</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Video ID: {ytId}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: '600' }}>Invalid YouTube URL formatting</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3 — Video Settings */}
              <div>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>Section 3: Video Settings</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      required
                      value={videoFormData.duration}
                      onChange={e => setVideoFormData({ ...videoFormData, duration: e.target.value })}
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div className="form-group">
                    <label>Video Order in Chapter</label>
                    <input
                      type="number"
                      required
                      value={videoFormData.order}
                      onChange={e => setVideoFormData({ ...videoFormData, order: e.target.value })}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={videoFormData.isFree}
                      onChange={e => {
                        const val = e.target.checked;
                        setVideoFormData({
                          ...videoFormData,
                          isFree: val,
                          isLocked: val ? false : videoFormData.isLocked // Mutual exclusion
                        });
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    <span>Free Preview</span>
                    {videoFormData.isFree && (
                      <span style={{ backgroundColor: 'var(--success)20', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', marginLeft: '4px' }}>
                        FREE
                      </span>
                    )}
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={videoFormData.isLocked}
                      disabled={videoFormData.isFree} // If Free Preview is ON, Locked is locked to OFF
                      onChange={e => setVideoFormData({ ...videoFormData, isLocked: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    <span>Locked Video</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', margin: '24px -32px 0 -32px', paddingLeft: '32px', paddingRight: '32px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowVideoModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <span>{editingVideo ? 'Update Video' : 'Add Video'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
