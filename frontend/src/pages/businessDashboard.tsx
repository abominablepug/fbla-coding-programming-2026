import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { Plus, Edit2, Eye } from 'lucide-react';
import { enqueueAlert } from '../components/alerts';
import '../styles/businessDashboard.css';

interface BusinessProfile {
  business_id: number;
  business_name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  created_at: string;
  updated_at: string;
}

interface Advertisement {
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

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  image_url: string;
}

interface Job {
  job_id: number;
  title: string;
  description: string;
  location: string;
  status: string;
  salary_range: string;
  applicant_count: number;
  posted_date: string;
}

const BusinessDashboard = () => {
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
  const navigate = useNavigate();
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [adFile, setAdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({});
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const profileResponse = await fetch(`${AUTH_BASE_URL}/jobs/business/profile`, {
        credentials: 'include'
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setBusinessProfile(profileData);
        setFormData(profileData);
      } else if (profileResponse.status === 404) {
        setBusinessProfile(null);
      } else if (profileResponse.status === 401) {
        navigate('/login');
        return;
      }

      const jobsResponse = await fetch(`${AUTH_BASE_URL}/jobs/business/jobs`, {
        credentials: 'include'
      });

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobs(jobsData.jobs || []);
      }

      const eventsResponse = await fetch(`${AUTH_BASE_URL}/events/business`, {
        credentials: 'include'
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }
      const adsResponse = await fetch(`${AUTH_BASE_URL}/ads/business`, { credentials: 'include' });
      if (adsResponse.ok) {
        const data = await adsResponse.json();
        setAds(data || []);
      }
      
      const couponsResponse = await fetch(`${AUTH_BASE_URL}/coupons/business`, { credentials: 'include' });
      if (couponsResponse.ok) {
        const data = await couponsResponse.json();
        setCoupons(data || []);
      }

    } catch (error) {
      console.error('Error fetching business data:', error);
      enqueueAlert({ message: 'Error loading data', textColor: 'text-red-300' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
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
  };

  const handleSaveProfile = async () => {
    try {
      const method = businessProfile ? 'PUT' : 'POST';
      const response = await fetch(`${AUTH_BASE_URL}/jobs/business/profile`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchBusinessData();
        setEditing(false);
        enqueueAlert({ message: 'Profile updated successfully', textColor: 'text-green-300' });
      } else {
        enqueueAlert({ message: 'Failed to update profile', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      enqueueAlert({ message: 'Error saving profile', textColor: 'text-red-300' });
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title || !editingEvent?.start_time || !editingEvent?.end_time) return;
    
    try {
      const isNew = !editingEvent.id;
      const url = isNew ? `${AUTH_BASE_URL}/events/create` : `${AUTH_BASE_URL}/events/${editingEvent.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = {
          ...editingEvent,
          start_time: new Date(editingEvent.start_time).toISOString(),
          end_time: new Date(editingEvent.end_time).toISOString()
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchBusinessData();
        setShowEventForm(false);
        setEditingEvent(null);
        enqueueAlert({ message: isNew ? 'Event created successfully' : 'Event updated successfully', textColor: 'text-green-300' });
      } else {
        enqueueAlert({ message: 'Failed to save event', textColor: 'text-red-300' });
      }
    } catch (error) {
      enqueueAlert({ message: 'Error saving event', textColor: 'text-red-300' });
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`${AUTH_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchBusinessData();
        enqueueAlert({ message: 'Event deleted', textColor: 'text-green-300' });
      } else {
        enqueueAlert({ message: 'Failed to delete event', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueAlert({ message: 'Error deleting event', textColor: 'text-red-300' });
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;

    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/business/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchBusinessData();
        enqueueAlert({ message: 'Job posting deleted', textColor: 'text-green-300' });
      } else {
        enqueueAlert({ message: 'Failed to delete job', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      enqueueAlert({ message: 'Error deleting job', textColor: 'text-red-300' });
    }
  };

  if (loading) {
    return (
      <Body>
        <Navbar />
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </Body>
    );
  }

  return (
    <Body>
      <Navbar />
      <div className="business-dashboard-container">
        <div className="dashboard-content">
          {/* Business Profile Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h1>Business Profile</h1>
              {!editing && (
                <button
                  className="action-btn edit-btn"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 size={18} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <form className="profile-form">
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    value={formData.business_name || ''}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setFormData(businessProfile || {});
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : businessProfile ? (
              <div className="profile-view">
                <div className="profile-item">
                  <h3>{businessProfile.business_name}</h3>
                  {businessProfile.description && <p>{businessProfile.description}</p>}
                </div>
                <div className="profile-grid">
                  {businessProfile.category && <div><strong>Category:</strong> {businessProfile.category}</div>}
                  {businessProfile.address && <div><strong>Address:</strong> {businessProfile.address}</div>}
                  {businessProfile.phone && <div><strong>Phone:</strong> {businessProfile.phone}</div>}
                  {businessProfile.email && <div><strong>Email:</strong> {businessProfile.email}</div>}
                  {businessProfile.website && (
                    <div>
                      <strong>Website:</strong> <a href={businessProfile.website} target="_blank" rel="noopener noreferrer">{businessProfile.website}</a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="profile-create-prompt">
                <p className="no-data">No business profile found. Create one to get started!</p>
                <button
                  className="btn-primary"
                  onClick={() => setEditing(true)}
                >
                  Create Profile
                </button>
              </div>
            )}
          </div>

          {/* Events Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Live Events & Flash Sales</h2>
              <button
                className="action-btn new-job-btn"
                onClick={() => {
                  setEditingEvent({
                    title: '', description: '', image_url: '',
                    start_time: new Date().toISOString().slice(0, 16),
                    end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
                  });
                  setShowEventForm(true);
                }}
              >
                <Plus size={18} /> New Event
              </button>
            </div>

            {showEventForm ? (
              <form className="profile-form" onSubmit={handleSaveEvent}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={editingEvent?.title || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editingEvent?.description || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="datetime-local"
                      value={editingEvent?.start_time ? new Date(editingEvent.start_time).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="datetime-local"
                      value={editingEvent?.end_time ? new Date(editingEvent.end_time).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={editingEvent?.image_url || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, image_url: e.target.value })}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save Event</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowEventForm(false)}>Cancel</button>
                </div>
              </form>
            ) : events.length > 0 ? (
              <div className="jobs-list">
                {events.map((event) => (
                  <div key={event.id} className="job-item">
                    <div className="job-info">
                      <h3>{event.title}</h3>
                      <p className="job-location text-sm text-neutral-400">
                        {new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="job-actions">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => {
                          setEditingEvent(event);
                          setShowEventForm(true);
                        }}
                        title="Edit event"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteEvent(event.id)}
                        title="Delete event"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No active events. Create one to engage customers!</p>
            )}
          </div>


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
          </div>

          {/* Jobs Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Job Postings</h2>
              <button
                className="action-btn new-job-btn"
                onClick={() => navigate('/business/jobs/new')}
              >
                <Plus size={18} /> New Job
              </button>
            </div>

            {jobs.length > 0 ? (
              <div className="jobs-list">
                {jobs.map((job) => (
                  <div key={job.job_id} className="job-item">
                    <div className="job-info">
                      <h3>{job.title}</h3>
                      <p className="job-location">{job.location}</p>
                      {job.salary_range && <p className="job-salary">{job.salary_range}</p>}
                    </div>
                    <div className="job-meta">
                      <span className={`status-badge ${job.status}`}>{job.status}</span>
                      <span className="applicant-count">{job.applicant_count} applicants</span>
                    </div>
                    <div className="job-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => navigate(`/business/jobs/${job.job_id}`)}
                        title="View applicants"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => navigate(`/business/jobs/${job.job_id}/edit`)}
                        title="Edit job"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteJob(job.job_id)}
                        title="Delete job"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No job postings yet. Create one to attract candidates!</p>
            )}
          </div>
        </div>
      </div>
    </Body>
  );
};

export default BusinessDashboard;
