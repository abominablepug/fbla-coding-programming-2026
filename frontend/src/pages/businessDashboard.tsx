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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({});

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
    } catch (error) {
      console.error('Error fetching business data:', error);
      enqueueAlert({ message: 'Error loading data', textColor: 'text-red-300' });
    } finally {
      setLoading(false);
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
