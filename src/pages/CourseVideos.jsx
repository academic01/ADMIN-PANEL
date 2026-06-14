import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where,
  orderBy, onSnapshot, addDoc,
  updateDoc, deleteDoc, doc,
  increment, serverTimestamp
} from 'firebase/firestore';

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0,
  right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalTitleStyle = {
  color: '#0D2240',
  margin: '0 0 24px',
  fontSize: '20px',
  fontWeight: '800'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #E5E5E5',
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '8px'
};

const toggleLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px'
};

const editBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '4px'
};

const deleteBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '4px'
};

const defaultVideoForm = {
  title: '',
  chapterTitle: '',
  description: '',
  videoUrl: '',
  duration: '',
  order: '',
  isFree: false,
  isLocked: true
};

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        color: '#444',
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '6px'
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ onAddChapter }) {
  return (
    <div style={{
      padding: '64px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      backgroundColor: 'white',
      borderRadius: '16px',
      border: '1px solid #E5E5E5',
      margin: '24px'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#F9F9F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: '24px'
      }}>
        📺
      </div>
      <div>
        <h3 style={{ fontSize: '18px', color: '#0D2240', margin: 0, fontWeight: '700' }}>No content yet</h3>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '4px', margin: 0 }}>
          Add your first chapter to get started building this course structure.
        </p>
      </div>
      <button 
        onClick={onAddChapter}
        style={{
          padding: '12px 24px',
          backgroundColor: '#0D2240',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
          marginTop: '8px'
        }}
      >
        + Add First Chapter
      </button>
    </div>
  );
}

export default function CourseVideos({ courseId, courseTitle, setPage }) {
  const [chapters, setChapters] = useState([]);
  const [videos, setVideos] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState([]);

  // Chapter Modal State
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoForm, setVideoForm] = useState(defaultVideoForm);

  useEffect(() => {
    if (!courseId) return;

    // Load chapters for this course
    const chaptersQuery = query(
      collection(db, 'chapters'),
      where('courseId', '==', courseId),
      orderBy('index', 'asc')
    );
    
    const unsubChapters = onSnapshot(
      chaptersQuery, (snap) => {
      setChapters(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    });
    
    // Load videos for this course
    const videosQuery = query(
      collection(db, 'videos'),
      where('courseId', '==', courseId)
    );
    
    const unsubVideos = onSnapshot(
      videosQuery, (snap) => {
      setVideos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    });
    
    return () => {
      unsubChapters();
      unsubVideos();
    };
  }, [courseId]);

  // Helper: get videos for a chapter
  const getChapterVideos = (chapterTitle) => {
    return videos
      .filter(v => 
        v.chapterTitle === chapterTitle)
      .sort((a, b) => 
        (a.order || 0) - (b.order || 0));
  };

  const totalVideos = videos.length;
  const totalChapters = chapters.length;

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId)
        ? prev.filter(id => 
            id !== chapterId)
        : [...prev, chapterId]);
  };

  // YouTube ID extractor:
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // YouTube thumbnail preview:
  const youtubeThumbnail = 
    getYouTubeId(videoForm.videoUrl)
    ? `https://img.youtube.com/vi/${
        getYouTubeId(videoForm.videoUrl)
      }/hqdefault.jpg`
    : null;

  // handleAddChapter function:
  const handleAddChapter = async () => {
    if (!chapterTitle.trim()) return;
    setSaving(true);
    
    try {
      const newChapterIndex = chapters.length;
      
      await addDoc(
        collection(db, 'chapters'), {
        courseId: courseId,
        title: chapterTitle.trim(),
        index: newChapterIndex,
        createdAt: serverTimestamp()
      });
      
      setShowChapterModal(false);
      setChapterTitle('');
    } catch (e) {
      console.error('Add chapter:', e);
      alert('Failed to add chapter: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // handleSaveVideo function:
  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() ||
        !videoForm.chapterTitle ||
        !getYouTubeId(videoForm.videoUrl))
      return;
    
    setSavingVideo(true);
    
    try {
      const chapterIndex = chapters
        .findIndex(ch => 
          ch.title === 
          videoForm.chapterTitle);
      
      const videoData = {
        courseId: courseId,
        chapterTitle: 
          videoForm.chapterTitle,
        chapterIndex: 
          chapterIndex >= 0 
            ? chapterIndex : 0,
        title: videoForm.title.trim(),
        description: 
          videoForm.description.trim(),
        videoUrl: videoForm.videoUrl.trim(),
        duration: Number(
          videoForm.duration) || 0,
        order: Number(
          videoForm.order) || 1,
        isFree: videoForm.isFree,
        isLocked: !videoForm.isFree,
        views: editingVideo ? (editingVideo.views || 0) : 0,
      };
      
      if (editingVideo) {
        await updateDoc(
          doc(db, 'videos', 
            editingVideo.id),
          {
            ...videoData,
            updatedAt: serverTimestamp()
          });
      } else {
        await addDoc(
          collection(db, 'videos'),
          {
            ...videoData,
            createdAt: serverTimestamp()
          });
        
        // Increment course video count
        await updateDoc(
          doc(db, 'courses', courseId),
          { totalVideos: 
            increment(1) });
      }
      
      setShowVideoModal(false);
      setEditingVideo(null);
      setVideoForm(defaultVideoForm);
      
    } catch (e) {
      console.error('Save video:', e);
      alert('Failed to save: ' + e.message);
    } finally {
      setSavingVideo(false);
    }
  };

  // Delete video function:
  const deleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await deleteDoc(
        doc(db, 'videos', videoId));
      await updateDoc(
        doc(db, 'courses', courseId),
        { totalVideos: 
            increment(-1) });
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        borderBottom: '1px solid #E5E5E5',
        paddingBottom: '24px'
      }}>
        <div>
          <button 
            onClick={() => setPage('courses')}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              padding: 0
            }}
          >
            ← Back to Courses
          </button>
          <h1 style={{ color: '#0D2240', margin: 0, fontSize: '28px', fontWeight: '800' }}>
            {courseTitle}
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>
            {totalVideos} videos across {totalChapters} chapters
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setChapterTitle('');
              setShowChapterModal(true);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#0D2240',
              border: '1px solid #E5E5E5',
              borderRadius: '50px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            + Add Chapter
          </button>
          {chapters.length > 0 && (
            <button
              onClick={() => {
                setVideoForm({
                  ...defaultVideoForm,
                  chapterTitle: chapters[0].title,
                  order: getChapterVideos(chapters[0].title).length + 1
                });
                setShowVideoModal(true);
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0D2240',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Add Video
            </button>
          )}
        </div>
      </div>

      {/* Chapters list / Empty State */}
      {chapters.length === 0 ? (
        <EmptyState 
          onAddChapter={() => {
            setChapterTitle('');
            setShowChapterModal(true);
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chapters.map((chapter, idx) => {
            const chapterVideos = getChapterVideos(chapter.title);
            const isExpanded = expandedChapters.includes(chapter.id);
            
            return (
              <div key={chapter.id} style={{
                border: '1px solid #E5E5E5',
                borderRadius: '16px',
                backgroundColor: 'white',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                {/* Chapter header */}
                <div
                  onClick={() => toggleChapter(chapter.id)}
                  style={{
                    padding: '20px 24px',
                    backgroundColor: '#F9F9F9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: isExpanded ? '1px solid #E5E5E5' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{
                      color: '#0D2240',
                      fontWeight: '800',
                      fontSize: '16px'
                    }}>
                      {chapter.title}
                    </span>
                    <span style={{
                      color: '#888',
                      fontSize: '13px',
                      backgroundColor: 'white',
                      padding: '4px 10px',
                      borderRadius: '50px',
                      border: '1px solid #E5E5E5',
                      fontWeight: '600'
                    }}>
                      {chapterVideos.length} videos
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setVideoForm({
                          ...defaultVideoForm,
                          chapterTitle: chapter.title,
                          order: chapterVideos.length + 1
                        });
                        setShowVideoModal(true);
                      }}
                      style={{
                        backgroundColor: '#EEF2FF',
                        color: '#0D2240',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      + Add Video
                    </button>
                    <span 
                      onClick={() => toggleChapter(chapter.id)}
                      style={{
                        color: '#888',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '4px',
                        userSelect: 'none'
                      }}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
                
                {/* Videos list */}
                {isExpanded && (
                  <div>
                    {chapterVideos.length === 0 ? (
                      <div style={{
                        padding: '32px',
                        textAlign: 'center',
                        color: '#888',
                        fontSize: '14px'
                      }}>
                        No videos yet. Click "+ Add Video" above to add your first video to this chapter.
                      </div>
                    ) : (
                      chapterVideos.map((video, vIdx) => (
                        <div key={video.id} style={{
                          padding: '16px 24px',
                          borderTop: '1px solid #F0F0F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}>
                          <span style={{
                            color: '#888',
                            fontSize: '14px',
                            fontWeight: '600',
                            minWidth: '24px'
                          }}>
                            {vIdx + 1}
                          </span>
                          <span style={{ fontSize: '20px' }}>📺</span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '700',
                              color: '#0D2240',
                              fontSize: '14px'
                            }}>
                              {video.title}
                            </div>
                            {video.description && (
                              <div style={{
                                color: '#888',
                                fontSize: '12px',
                                marginTop: '2px'
                              }}>
                                {video.description}
                              </div>
                            )}
                          </div>
                          {video.isFree && (
                            <span style={{
                              backgroundColor: '#DCFCE7',
                              color: '#16A34A',
                              padding: '4px 10px',
                              borderRadius: '50px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>FREE</span>
                          )}
                          {video.duration > 0 && (
                            <span style={{
                              color: '#888',
                              fontSize: '13px',
                              fontWeight: '500',
                              backgroundColor: '#F9F9F9',
                              padding: '4px 10px',
                              borderRadius: '50px',
                              border: '1px solid #F0F0F0'
                            }}>
                              {video.duration} min
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingVideo(video);
                              setVideoForm({
                                title: video.title,
                                chapterTitle: video.chapterTitle,
                                description: video.description || '',
                                videoUrl: video.videoUrl,
                                duration: video.duration || '',
                                order: video.order || '',
                                isFree: video.isFree || false,
                                isLocked: video.isLocked ?? true
                              });
                              setShowVideoModal(true);
                            }}
                            style={editBtnStyle}
                          >✏️</button>
                          <button
                            onClick={() => deleteVideo(video.id)}
                            style={deleteBtnStyle}
                          >🗑️</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CHAPTER MODAL */}
      {showChapterModal && (
        <div style={overlayStyle}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '480px',
            maxWidth: '90vw'
          }}>
            <h2 style={{
              color: '#0D2240',
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: '800'
            }}>
              Add New Chapter
            </h2>
            <p style={{
              color: '#888',
              fontSize: '14px',
              margin: '0 0 24px'
            }}>
              Chapters organize your course videos into sections
            </p>
            
            <label style={{
              display: 'block',
              color: '#444',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              Chapter Title *
            </label>
            <input
              type="text"
              value={chapterTitle}
              onChange={e => setChapterTitle(e.target.value)}
              placeholder="e.g. Chapter 1: Introduction to Humanities"
              autoFocus
              style={inputStyle}
            />
            <p style={{
              color: '#888',
              fontSize: '12px',
              margin: '0 0 24px'
            }}>
              Examples: "Chapter 1: Ancient History", "Unit 2: World Wars", "Section 3: Indian Constitution"
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAddChapter}
                disabled={saving || !chapterTitle.trim()}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: saving ? '#888' : '#0D2240',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Adding...' : 'Add Chapter'}
              </button>
              <button
                onClick={() => setShowChapterModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: 'white',
                  color: '#888',
                  border: '1px solid #E5E5E5',
                  borderRadius: '50px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div style={overlayStyle}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={modalTitleStyle}>
              {editingVideo ? 'Edit Video' : 'Add New Video'}
            </h2>
            
            {/* Title */}
            <FormField label="Video Title *">
              <input
                value={videoForm.title}
                onChange={e => setVideoForm({
                  ...videoForm, 
                  title: e.target.value})}
                placeholder="e.g. Introduction to Ancient History"
                style={inputStyle}
              />
            </FormField>
            
            {/* Chapter dropdown */}
            <FormField label="Chapter *">
              <select
                value={videoForm.chapterTitle}
                onChange={e => setVideoForm({
                  ...videoForm,
                  chapterTitle: e.target.value})}
                style={inputStyle}
              >
                <option value="">
                  Select a chapter
                </option>
                {chapters.map(ch => (
                  <option 
                    key={ch.id}
                    value={ch.title}>
                    {ch.title}
                  </option>
                ))}
              </select>
            </FormField>
            
            {/* YouTube URL */}
            <FormField label="YouTube Video URL *">
              <input
                value={videoForm.videoUrl}
                onChange={e => setVideoForm({
                  ...videoForm,
                  videoUrl: e.target.value})}
                placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                style={inputStyle}
              />
              {/* URL validation feedback */}
              {videoForm.videoUrl && (
                <p style={{
                  color: getYouTubeId(videoForm.videoUrl) ? '#22C55E' : '#EF4444',
                  fontSize: '12px',
                  marginTop: '4px'
                }}>
                  {getYouTubeId(videoForm.videoUrl)
                    ? '✅ Valid YouTube URL'
                    : '❌ Invalid URL — paste a YouTube link'}
                </p>
              )}
              {/* Thumbnail preview */}
              {youtubeThumbnail && (
                <img
                  src={youtubeThumbnail}
                  alt="Video thumbnail"
                  style={{
                    width: '200px',
                    height: '112px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginTop: '8px'
                  }}
                />
              )}
            </FormField>
            
            {/* Description */}
            <FormField label="Description (optional)">
              <textarea
                value={videoForm.description}
                onChange={e => setVideoForm({
                  ...videoForm,
                  description: e.target.value})}
                placeholder="Brief note about what this video covers..."
                rows={2}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  resize: 'vertical'
                }}
              />
            </FormField>
            
            {/* Duration + Order (2 columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <FormField label="Duration (minutes)">
                <input
                  type="number"
                  value={videoForm.duration}
                  onChange={e => setVideoForm({
                    ...videoForm,
                    duration: e.target.value})}
                  placeholder="e.g. 45"
                  min="1"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Order in Chapter">
                <input
                  type="number"
                  value={videoForm.order}
                  onChange={e => setVideoForm({
                    ...videoForm,
                    order: e.target.value})}
                  placeholder="e.g. 1"
                  min="1"
                  style={inputStyle}
                />
              </FormField>
            </div>
            
            {/* Toggles */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              <label style={toggleLabelStyle}>
                <input
                  type="checkbox"
                  checked={videoForm.isFree}
                  onChange={e => setVideoForm({
                    ...videoForm,
                    isFree: e.target.checked,
                    isLocked: !e.target.checked
                  })}
                />
                <span>Free Preview</span>
                <span style={{
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  padding: '2px 8px',
                  borderRadius: '50px',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: videoForm.isFree ? 'inline' : 'none'
                }}>FREE</span>
              </label>
            </div>
            
            {/* Save + Cancel */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSaveVideo}
                disabled={savingVideo ||
                  !videoForm.title.trim() ||
                  !videoForm.chapterTitle ||
                  !getYouTubeId(videoForm.videoUrl)}
                style={{
                  flex: 1, padding: '14px',
                  backgroundColor: '#0D2240',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  opacity: savingVideo ? 0.7 : 1
                }}
              >
                {savingVideo ? 'Saving...' : (editingVideo ? 'Update Video' : 'Add Video')}
              </button>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setEditingVideo(null);
                }}
                style={{
                  flex: 1, padding: '14px',
                  backgroundColor: 'white',
                  color: '#888',
                  border: '1px solid #E5E5E5',
                  borderRadius: '50px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
