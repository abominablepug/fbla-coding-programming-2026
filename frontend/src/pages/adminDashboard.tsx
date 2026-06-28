import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { enqueueAlert } from '../components/alerts';
import '../styles/businessDashboard.css'; // Reuse styles

interface PendingAd {
  id: number;
  business_name: string;
  media_url: string;
  media_type: string;
  target_url: string;
  status: string;
  created_at: string;
}

interface AdminBusiness {
  bid: number;
  business_name: string;
  category: string;
  address: string;
  is_certified_local: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
  const navigate = useNavigate();
  const [ads, setAds] = useState<PendingAd[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${AUTH_BASE_URL}${url}` : url;
  };

  useEffect(() => {
    fetchPendingAds();
    fetchBusinesses();
  }, []);

  const fetchPendingAds = async () => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/ads/pending`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAds(data || []);
      } else if (response.status === 401 || response.status === 403) {
        enqueueAlert({ message: 'Access denied', textColor: 'text-red-300' });
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/admin/businesses`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBusinesses(data || []);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (adId: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/ads/${adId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        enqueueAlert({ message: `Advertisement ${status}`, textColor: 'text-green-300' });
        fetchPendingAds();
      } else {
        enqueueAlert({ message: 'Failed to update status', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleToggleCertified = async (bid: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/admin/businesses/${bid}/certify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_certified_local: !currentStatus })
      });

      if (response.ok) {
        enqueueAlert({ message: `Business certification updated`, textColor: 'text-green-300' });
        fetchBusinesses();
      } else {
        enqueueAlert({ message: 'Failed to update certification', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error updating certification:', error);
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
          <div className="dashboard-section">
            <div className="section-header">
              <h1>Admin Dashboard: Pending Advertisements</h1>
            </div>

            {ads.length > 0 ? (
              <div className="jobs-list">
                {ads.map((ad) => (
                  <div key={ad.id} className="job-item">
                    <div className="job-info" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      {ad.media_type === 'video' ? (
                        <video src={getMediaUrl(ad.media_url)} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} controls />
                      ) : (
                        <img src={getMediaUrl(ad.media_url)} alt="Ad" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      )}
                      <div>
                        <h3>Business: {ad.business_name}</h3>
                        <p>Type: {ad.media_type}</p>
                        {ad.target_url && <a href={ad.target_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--app-primary)', fontSize: '0.9em' }}>{ad.target_url}</a>}
                        <p style={{ fontSize: '0.8em', color: '#888' }}>Submitted: {new Date(ad.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="job-actions" style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn-primary"
                        style={{ backgroundColor: '#2e7d32', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                        onClick={() => handleUpdateStatus(ad.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ backgroundColor: '#c62828', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                        onClick={() => handleUpdateStatus(ad.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No pending advertisements.</p>
            )}
          </div>

          <div className="dashboard-section" style={{ marginTop: '30px' }}>
            <div className="section-header">
              <h1>Admin Dashboard: Certified Local Businesses</h1>
            </div>

            {businesses.length > 0 ? (
              <div className="jobs-list">
                {businesses.map((bus) => (
                  <div key={bus.bid} className="job-item">
                    <div className="job-info">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {bus.business_name}
                        {bus.is_certified_local && (
                          <span className="status-badge active" style={{ fontSize: '0.8em', padding: '2px 6px' }}>Certified Local ✅</span>
                        )}
                      </h3>
                      <p>Category: {bus.category || 'N/A'}</p>
                      <p>Address: {bus.address || 'N/A'}</p>
                      <p style={{ fontSize: '0.8em', color: '#888' }}>Joined: {bus.created_at ? new Date(bus.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="job-actions">
                      <button
                        className={bus.is_certified_local ? "btn-secondary" : "btn-primary"}
                        style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                        onClick={() => handleToggleCertified(bus.bid, bus.is_certified_local)}
                      >
                        {bus.is_certified_local ? 'Revoke Certification' : 'Certify as Local'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No businesses registered yet.</p>
            )}
          </div>
        </div>
      </div>
    </Body>
  );
};

export default AdminDashboard;
