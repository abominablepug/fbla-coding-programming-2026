import re

with open("frontend/src/pages/businessDashboard.tsx", "r") as f:
    content = f.read()

# Add Interfaces
if "interface Advertisement" not in content:
    content = content.replace("interface Event {", """interface Advertisement {
  id: number;
  media_url: string;
  media_type: string;
  target_url: string;
  status: string;
}

interface Coupon {
  id: number;
  title: string;
  discount_label: string;
  code: string;
  expires_at: string | null;
}

interface Event {""")

# Add state
if "const [ads, setAds]" not in content:
    content = content.replace("const [events, setEvents] = useState<Event[]>([]);", """const [events, setEvents] = useState<Event[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [adFile, setAdFile] = useState<File | null>(null);""")

# Add to fetchBusinessData
fetch_snippet = """      const eventsResponse = await fetch(`${AUTH_BASE_URL}/events/business`, {
        credentials: 'include'
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }"""

new_fetch_snippet = fetch_snippet + """
      const adsResponse = await fetch(`${AUTH_BASE_URL}/ads/business`, { credentials: 'include' });
      if (adsResponse.ok) {
        const data = await adsResponse.json();
        setAds(data || []);
      }
      
      const couponsResponse = await fetch(`${AUTH_BASE_URL}/coupons/business`, { credentials: 'include' });
      if (couponsResponse.ok) {
        const data = await couponsResponse.json();
        setCoupons(data || []);
      }"""

if "const adsResponse" not in content:
    content = content.replace(fetch_snippet, new_fetch_snippet)

# Add Handlers
handlers_snippet = """  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingAd?.id;
      const url = isNew ? `${AUTH_BASE_URL}/ads/create` : `${AUTH_BASE_URL}/ads/${editingAd?.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      let body;
      let headers = { credentials: 'include' } as any;
      
      if (adFile) {
        body = new FormData();
        if (editingAd?.target_url) body.append('target_url', editingAd.target_url);
        body.append('file', adFile);
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(editingAd);
      }

      const response = await fetch(url, { method, headers, credentials: 'include', body });
      if (response.ok) {
        fetchBusinessData();
        setShowAdForm(false);
        setEditingAd(null);
        setAdFile(null);
        enqueueAlert({ message: isNew ? 'Ad created (pending approval)' : 'Ad updated', textColor: 'text-green-300' });
      } else {
        enqueueAlert({ message: 'Failed to save ad', textColor: 'text-red-300' });
      }
    } catch (error) {
      enqueueAlert({ message: 'Error saving ad', textColor: 'text-red-300' });
    }
  };

  const handleDeleteAd = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      const response = await fetch(`${AUTH_BASE_URL}/ads/${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        fetchBusinessData();
        enqueueAlert({ message: 'Ad deleted', textColor: 'text-green-300' });
      }
    } catch (error) {
      enqueueAlert({ message: 'Error deleting ad', textColor: 'text-red-300' });
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.title || !editingCoupon?.discount_label || !editingCoupon?.code) return;
    
    try {
      const isNew = !editingCoupon.id;
      const url = isNew ? `${AUTH_BASE_URL}/coupons/create` : `${AUTH_BASE_URL}/coupons/${editingCoupon.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = { ...editingCoupon };
      if (payload.expires_at) {
        payload.expires_at = new Date(payload.expires_at).toISOString();
      } else {
        payload.expires_at = null;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchBusinessData();
        setShowCouponForm(false);
        setEditingCoupon(null);
        enqueueAlert({ message: isNew ? 'Coupon created' : 'Coupon updated', textColor: 'text-green-300' });
      }
    } catch (error) {
      enqueueAlert({ message: 'Error saving coupon', textColor: 'text-red-300' });
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const response = await fetch(`${AUTH_BASE_URL}/coupons/${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        fetchBusinessData();
        enqueueAlert({ message: 'Coupon deleted', textColor: 'text-green-300' });
      }
    } catch (error) {
      enqueueAlert({ message: 'Error deleting coupon', textColor: 'text-red-300' });
    }
  };"""

if "handleSaveAd" not in content:
    content = content.replace("  const handleSaveProfile", handlers_snippet + "\n\n  const handleSaveProfile")

# Add JSX
jsx_snippet = """
          {/* Advertisements Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Advertisements</h2>
              <button className="action-btn new-job-btn" onClick={() => { setEditingAd({}); setAdFile(null); setShowAdForm(true); }}>
                <Plus size={18} /> New Ad
              </button>
            </div>
            {showAdForm ? (
              <form className="profile-form" onSubmit={handleSaveAd}>
                <div className="form-group">
                  <label>Media File (Image/Video)</label>
                  <input type="file" accept="image/*,video/*" onChange={(e) => setAdFile(e.target.files?.[0] || null)} />
                </div>
                <div className="form-group">
                  <label>Target URL (Optional)</label>
                  <input type="url" value={editingAd?.target_url || ''} onChange={(e) => setEditingAd({ ...editingAd, target_url: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save Ad</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowAdForm(false)}>Cancel</button>
                </div>
              </form>
            ) : ads.length > 0 ? (
              <div className="jobs-list">
                {ads.map((ad) => (
                  <div key={ad.id} className="job-item">
                    <div className="job-info">
                      <p>Type: {ad.media_type}</p>
                      <span className={`status-badge ${ad.status}`}>{ad.status}</span>
                      {ad.target_url && <a href={ad.target_url} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.8em', color: '#4da6ff'}}>Link</a>}
                    </div>
                    <div className="job-actions">
                      <button className="action-btn delete-btn" onClick={() => handleDeleteAd(ad.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="no-data">No active advertisements. Post one to gain visibility!</p>}
          </div>

          {/* Coupons Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Coupons & Deals</h2>
              <button className="action-btn new-job-btn" onClick={() => { setEditingCoupon({}); setShowCouponForm(true); }}>
                <Plus size={18} /> New Coupon
              </button>
            </div>
            {showCouponForm ? (
              <form className="profile-form" onSubmit={handleSaveCoupon}>
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" value={editingCoupon?.title || ''} onChange={(e) => setEditingCoupon({ ...editingCoupon, title: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Label (e.g., 20% OFF) *</label>
                    <input type="text" value={editingCoupon?.discount_label || ''} onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_label: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Code *</label>
                    <input type="text" value={editingCoupon?.code || ''} onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Expires At</label>
                  <input type="datetime-local" value={editingCoupon?.expires_at ? new Date(editingCoupon.expires_at).toISOString().slice(0, 16) : ''} onChange={(e) => setEditingCoupon({ ...editingCoupon, expires_at: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save Coupon</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowCouponForm(false)}>Cancel</button>
                </div>
              </form>
            ) : coupons.length > 0 ? (
              <div className="jobs-list">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="job-item">
                    <div className="job-info">
                      <h3>{coupon.title} ({coupon.discount_label})</h3>
                      <p className="job-location">Code: {coupon.code}</p>
                      {coupon.expires_at && <p className="job-location">Expires: {new Date(coupon.expires_at).toLocaleDateString()}</p>}
                    </div>
                    <div className="job-actions">
                      <button className="action-btn edit-btn" onClick={() => { setEditingCoupon(coupon); setShowCouponForm(true); }}><Edit2 size={18} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDeleteCoupon(coupon.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="no-data">No coupons created. Offer deals to attract more customers!</p>}
"""

if "{/* Advertisements Section */}" not in content:
    content = content.replace("          {/* Jobs Section */}", jsx_snippet + "\n          {/* Jobs Section */}")

with open("frontend/src/pages/businessDashboard.tsx", "w") as f:
    f.write(content)

