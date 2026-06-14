import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, Image, Megaphone, Share2, Save, Plus, Trash2, CreditCard } from 'lucide-react';

export default function SettingsManagement() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // General Form State
  const [general, setGeneral] = useState({
    appName: 'Aakash Academics',
    tagline: 'Empowering Education digitally',
    contactPhone: '',
    contactEmail: '',
    supportWhatsapp: ''
  });

  // Hero & Banners Form State
  const [hero, setHero] = useState({
    heroHeading1: '',
    heroHeading2: '',
    heroSubheading: '',
    stats: [
      { number: '', label: '' },
      { number: '', label: '' },
      { number: '', label: '' }
    ]
  });

  // Announcements Form State
  const [announcements, setAnnouncements] = useState({
    showAnnouncementBar: false,
    announcementText: '',
    announcementLink: '',
    showTicker: false,
    tickerItems: []
  });

  // Social Links Form State
  const [socials, setSocials] = useState({
    youtube: '',
    instagram: '',
    facebook: '',
    telegram: ''
  });

  // Payment Settings Form State
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: '',
    upiName: '',
    upiQrImageUrl: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: ''
    },
    paymentInstructions: '',
    whatsappForPayment: '',
    isPaymentEnabled: true
  });

  // New Ticker item helper
  const [newTickerText, setNewTickerText] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'site_settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Populate tabs
        setGeneral({
          appName: data.appName || 'Aakash Academics',
          tagline: data.tagline || '',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || '',
          supportWhatsapp: data.supportWhatsapp || ''
        });

        setHero({
          heroHeading1: data.heroHeadingLine1 || data.heroHeading1 || '',
          heroHeading2: data.heroHeadingLine2 || data.heroHeading2 || '',
          heroSubheading: data.heroSubheading || '',
          stats: data.stats || [
            { number: '', label: '' },
            { number: '', label: '' },
            { number: '', label: '' }
          ]
        });

        setAnnouncements({
          showAnnouncementBar: data.showAnnouncementBar || false,
          announcementText: data.announcementText || '',
          announcementLink: data.announcementLink || '',
          showTicker: data.showTicker || false,
          tickerItems: data.tickerItems || []
        });

        setSocials({
          youtube: data.socialLinks?.youtube || data.youtube || '',
          instagram: data.socialLinks?.instagram || data.instagram || '',
          facebook: data.socialLinks?.facebook || data.facebook || '',
          telegram: data.socialLinks?.telegram || data.telegram || ''
        });

        setPaymentSettings({
          upiId: data.paymentSettings?.upiId || '',
          upiName: data.paymentSettings?.upiName || '',
          upiQrImageUrl: data.paymentSettings?.upiQrImageUrl || '',
          bankDetails: {
            accountName: data.paymentSettings?.bankDetails?.accountName || '',
            accountNumber: data.paymentSettings?.bankDetails?.accountNumber || '',
            ifscCode: data.paymentSettings?.bankDetails?.ifscCode || '',
            bankName: data.paymentSettings?.bankDetails?.bankName || '',
            branchName: data.paymentSettings?.bankDetails?.branchName || ''
          },
          paymentInstructions: data.paymentSettings?.paymentInstructions || '',
          whatsappForPayment: data.paymentSettings?.whatsappForPayment || '',
          isPaymentEnabled: data.paymentSettings?.isPaymentEnabled !== false
        });
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
    setLoading(false);
  };

  const saveTabSettings = async (tabData) => {
    try {
      const docRef = doc(db, 'settings', 'site_settings');
      await setDoc(docRef, tabData, { merge: true });
      showToast("Settings saved ✅");
    } catch (e) {
      alert("Error saving settings: " + e.message);
    }
  };

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    saveTabSettings(general);
  };

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    saveTabSettings({
      heroHeadingLine1: hero.heroHeading1,
      heroHeadingLine2: hero.heroHeading2,
      heroSubheading: hero.heroSubheading,
      stats: hero.stats
    });
  };

  const handleAnnouncementsSubmit = (e) => {
    e.preventDefault();
    saveTabSettings(announcements);
  };

  const handleSocialsSubmit = (e) => {
    e.preventDefault();
    saveTabSettings({
      socialLinks: {
        youtube: socials.youtube || '',
        instagram: socials.instagram || '',
        facebook: socials.facebook || '',
        telegram: socials.telegram || ''
      }
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    saveTabSettings({ paymentSettings });
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentSettings(prev => ({
        ...prev,
        upiQrImageUrl: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const addTickerItem = () => {
    if (!newTickerText.trim()) return;
    setAnnouncements(prev => ({
      ...prev,
      tickerItems: [...prev.tickerItems, newTickerText.trim()]
    }));
    setNewTickerText('');
  };

  const removeTickerItem = (index) => {
    setAnnouncements(prev => ({
      ...prev,
      tickerItems: prev.tickerItems.filter((_, idx) => idx !== index)
    }));
  };

  if (loading) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="management-container">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', backgroundColor: 'var(--primary)', color: 'white',
          padding: '16px 24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 2000,
          fontWeight: '600', animation: 'slideIn 0.3s ease'
        }}>
          {toast}
        </div>
      )}

      <div className="management-header">
        <div>
          <h2>System Settings</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Customize global configuration, banners, announcements and social links.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '32px', gap: '8px' }}>
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'hero', label: 'Hero & Banners', icon: Image },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'socials', label: 'Social Links', icon: Share2 },
          { id: 'payment', label: 'Payment Settings', icon: CreditCard }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: 'none',
                background: 'transparent', borderBottom: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="table-container" style={{ padding: '32px', maxWidth: '800px' }}>
        {activeTab === 'general' && (
          <form onSubmit={handleGeneralSubmit}>
            <div className="form-group">
              <label>App Name</label>
              <input 
                type="text" 
                value={general.appName} 
                onChange={(e) => setGeneral({ ...general, appName: e.target.value })} 
                required
              />
            </div>
            <div className="form-group">
              <label>Tagline</label>
              <input 
                type="text" 
                value={general.tagline} 
                onChange={(e) => setGeneral({ ...general, tagline: e.target.value })} 
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contact Phone</label>
                <input 
                  type="text" 
                  value={general.contactPhone} 
                  onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  value={general.contactEmail} 
                  onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })} 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Support WhatsApp Number</label>
              <input 
                type="text" 
                value={general.supportWhatsapp} 
                onChange={(e) => setGeneral({ ...general, supportWhatsapp: e.target.value })} 
                placeholder="e.g. +919999999999"
              />
            </div>
            <button type="submit" className="primary-button" style={{ marginTop: '16px' }}>
              <Save size={18} />
              <span>Save General Settings</span>
            </button>
          </form>
        )}

        {activeTab === 'hero' && (
          <form onSubmit={handleHeroSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Hero Heading Line 1</label>
                <input 
                  type="text" 
                  value={hero.heroHeading1} 
                  onChange={(e) => setHero({ ...hero, heroHeading1: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label>Hero Heading Line 2</label>
                <input 
                  type="text" 
                  value={hero.heroHeading2} 
                  onChange={(e) => setHero({ ...hero, heroHeading2: e.target.value })} 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Hero Subheading</label>
              <textarea 
                rows="3" 
                value={hero.heroSubheading} 
                onChange={(e) => setHero({ ...hero, heroSubheading: e.target.value })}
              ></textarea>
            </div>

            <h4 style={{ fontSize: '15px', marginTop: '24px', marginBottom: '12px' }}>Hero Stats Counters</h4>
            {hero.stats.map((stat, index) => (
              <div className="form-row" key={index} style={{ marginBottom: '12px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Stat {index + 1} Number</label>
                  <input 
                    type="text" 
                    value={stat.number} 
                    onChange={(e) => {
                      const updatedStats = [...hero.stats];
                      updatedStats[index].number = e.target.value;
                      setHero({ ...hero, stats: updatedStats });
                    }} 
                    placeholder="e.g. 8,000+"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Stat {index + 1} Label</label>
                  <input 
                    type="text" 
                    value={stat.label} 
                    onChange={(e) => {
                      const updatedStats = [...hero.stats];
                      updatedStats[index].label = e.target.value;
                      setHero({ ...hero, stats: updatedStats });
                    }} 
                    placeholder="e.g. Happy Students"
                  />
                </div>
              </div>
            ))}

            <button type="submit" className="primary-button" style={{ marginTop: '24px' }}>
              <Save size={18} />
              <span>Save Hero Config</span>
            </button>
          </form>
        )}

        {activeTab === 'announcements' && (
          <form onSubmit={handleAnnouncementsSubmit}>
            <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={announcements.showAnnouncementBar} 
                  onChange={(e) => setAnnouncements({ ...announcements, showAnnouncementBar: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
                Show Announcement Bar
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={announcements.showTicker} 
                  onChange={(e) => setAnnouncements({ ...announcements, showTicker: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
                Show Announcements Ticker
              </label>
            </div>

            <div className="form-group">
              <label>Announcement Bar Text</label>
              <input 
                type="text" 
                value={announcements.announcementText} 
                onChange={(e) => setAnnouncements({ ...announcements, announcementText: e.target.value })} 
                placeholder="e.g. Admission open for CUET 2026 Batch!"
              />
            </div>

            <div className="form-group">
              <label>Announcement Action Link URL</label>
              <input 
                type="text" 
                value={announcements.announcementLink} 
                onChange={(e) => setAnnouncements({ ...announcements, announcementLink: e.target.value })} 
                placeholder="https://..."
              />
            </div>

            {/* Ticker List manager */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Ticker Announcements List</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {announcements.tickerItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{item}</span>
                    <button type="button" onClick={() => removeTickerItem(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {announcements.tickerItems.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>No ticker announcements added yet.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={newTickerText} 
                  onChange={(e) => setNewTickerText(e.target.value)} 
                  placeholder="Enter new announcement line..." 
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addTickerItem} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <button type="submit" className="primary-button" style={{ marginTop: '32px' }}>
              <Save size={18} />
              <span>Save Announcements</span>
            </button>
          </form>
        )}

        {activeTab === 'socials' && (
          <form onSubmit={handleSocialsSubmit}>
            <div className="form-group">
              <label>YouTube Channel URL</label>
              <input 
                type="text" 
                value={socials.youtube} 
                onChange={(e) => setSocials({ ...socials, youtube: e.target.value })} 
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="form-group">
              <label>Instagram Page URL</label>
              <input 
                type="text" 
                value={socials.instagram} 
                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} 
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="form-group">
              <label>Facebook Page URL</label>
              <input 
                type="text" 
                value={socials.facebook} 
                onChange={(e) => setSocials({ ...socials, facebook: e.target.value })} 
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="form-group">
              <label>Telegram Channel/Group URL</label>
              <input 
                type="text" 
                value={socials.telegram} 
                onChange={(e) => setSocials({ ...socials, telegram: e.target.value })} 
                placeholder="https://t.me/..."
              />
            </div>
            <button type="submit" className="primary-button" style={{ marginTop: '16px' }}>
              <Save size={18} />
              <span>Save Social Links</span>
            </button>
          </form>
        )}

        {activeTab === 'payment' && (
          <form onSubmit={handlePaymentSubmit}>
            {/* Section 1 — UPI Details */}
            <h4 style={{ fontSize: '15px', color: 'var(--primary)', marginBottom: '16px', fontWeight: '700', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Section 1 — UPI Details
            </h4>
            <div className="form-group">
              <label>UPI ID *</label>
              <input 
                type="text" 
                required
                value={paymentSettings.upiId} 
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })} 
                placeholder="e.g. yourname@paytm or yourname@phonepe"
              />
            </div>
            <div className="form-group">
              <label>UPI Display Name *</label>
              <input 
                type="text" 
                required
                value={paymentSettings.upiName} 
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiName: e.target.value })} 
                placeholder="e.g. Aakash Academics"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Upload QR Code Image</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleQrUpload}
                style={{ padding: '8px 0', border: 'none' }}
              />
              {paymentSettings.upiQrImageUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img 
                    src={paymentSettings.upiQrImageUrl} 
                    width={200} 
                    height={200} 
                    style={{ borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-light)' }}
                    alt="UPI QR Code Preview" 
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    This QR will be shown to students
                  </p>
                </div>
              )}
            </div>

            {/* Section 2 — Bank Details */}
            <h4 style={{ fontSize: '15px', color: 'var(--primary)', marginTop: '24px', marginBottom: '16px', fontWeight: '700', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Section 2 — Bank Details (Optional)
            </h4>
            <div className="form-group">
              <label>Account Holder Name</label>
              <input 
                type="text" 
                value={paymentSettings.bankDetails.accountName} 
                onChange={(e) => setPaymentSettings({
                  ...paymentSettings,
                  bankDetails: { ...paymentSettings.bankDetails, accountName: e.target.value }
                })} 
                placeholder="e.g. Aakash Academics Private Limited"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Account Number</label>
                <input 
                  type="text" 
                  value={paymentSettings.bankDetails.accountNumber} 
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    bankDetails: { ...paymentSettings.bankDetails, accountNumber: e.target.value }
                  })} 
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input 
                  type="text" 
                  value={paymentSettings.bankDetails.ifscCode} 
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    bankDetails: { ...paymentSettings.bankDetails, ifscCode: e.target.value }
                  })} 
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input 
                  type="text" 
                  value={paymentSettings.bankDetails.bankName} 
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    bankDetails: { ...paymentSettings.bankDetails, bankName: e.target.value }
                  })} 
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input 
                  type="text" 
                  value={paymentSettings.bankDetails.branchName} 
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    bankDetails: { ...paymentSettings.bankDetails, branchName: e.target.value }
                  })} 
                  placeholder="e.g. Connaught Place, New Delhi"
                />
              </div>
            </div>

            {/* Section 3 — Payment Instructions */}
            <h4 style={{ fontSize: '15px', color: 'var(--primary)', marginTop: '24px', marginBottom: '16px', fontWeight: '700', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Section 3 — Payment Instructions
            </h4>
            <div className="form-group">
              <label>Payment Instructions *</label>
              <textarea 
                rows="4" 
                required
                value={paymentSettings.paymentInstructions} 
                onChange={(e) => setPaymentSettings({ ...paymentSettings, paymentInstructions: e.target.value })} 
                placeholder="1. Pay the amount via UPI or scan QR code&#10;2. Take screenshot of payment&#10;3. Send screenshot to WhatsApp...&#10;4. Your course will be activated within 2 hours"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', height: 'auto', resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label>WhatsApp Number for Payment Proof *</label>
              <input 
                type="text" 
                required
                value={paymentSettings.whatsappForPayment} 
                onChange={(e) => setPaymentSettings({ ...paymentSettings, whatsappForPayment: e.target.value })} 
                placeholder="e.g. 919876543210 (include country code, no space or +)"
              />
            </div>

            {/* Section 4 — Toggle */}
            <h4 style={{ fontSize: '15px', color: 'var(--primary)', marginTop: '24px', marginBottom: '16px', fontWeight: '700', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              Section 4 — Toggle
            </h4>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={paymentSettings.isPaymentEnabled} 
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, isPaymentEnabled: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
                Accept Payments
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                If unchecked, students will see a "Payments temporarily unavailable" message.
              </p>
            </div>

            <button type="submit" className="primary-button" style={{ marginTop: '24px' }}>
              <Save size={18} />
              <span>Save Payment Settings</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
