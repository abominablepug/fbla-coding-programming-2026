import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { X, Download } from 'lucide-react';
import { enqueueAlert } from '../components/alerts';
import '../styles/businessJobManager.css';

interface Job {
  job_id: number;
  title: string;
  description: string;
  requirements: string[];
  salary_range: string;
  job_type: string;
  location: string;
  longitude: number;
  latitude: number;
  status: string;
}

interface Applicant {
  app_id: number;
  user_id: number;
  username: string;
  email: string;
  profile_picture: string;
  status: string;
  resume_url: string;
  skills: string[];
  education: any;
  applied_date: string;
}

const BusinessJobManager = () => {
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [_job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [_isEditing, _setIsEditing] = useState(false);
  const [showApplicantDetail, setShowApplicantDetail] = useState<number | null>(null);
  const [currentApplicant, setCurrentApplicant] = useState<Applicant | null>(null);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    } else {
      // New job mode with geolocation
      setLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setFormData({
              title: '',
              description: '',
              requirements: [],
              salary_range: '',
              job_type: '',
              location: '',
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude,
              status: 'active'
            });
            setLoading(false);
          },
          () => {
            setFormData({
              title: '',
              description: '',
              requirements: [],
              salary_range: '',
              job_type: '',
              location: '',
              status: 'active'
            });
            setLoading(false);
          }
        );
      } else {
        setFormData({
          title: '',
          description: '',
          requirements: [],
          salary_range: '',
          job_type: '',
          location: '',
          status: 'active'
        });
        setLoading(false);
      }
    }
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${AUTH_BASE_URL}/jobs/business/jobs/${jobId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data);
        setFormData(data);

        // Fetch applicants
        const appResponse = await fetch(`${AUTH_BASE_URL}/jobs/business/jobs/${jobId}/applicants`, {
          credentials: 'include'
        });

        if (appResponse.ok) {
          const appData = await appResponse.json();
          setApplicants(appData.applicants || []);
        }
      } else if (response.status === 401) {
        navigate('/login');
      } else {
        enqueueAlert({ message: 'Job not found', textColor: 'text-red-300' });
        navigate('/business/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job data:', error);
      enqueueAlert({ message: 'Error loading job', textColor: 'text-red-300' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = () => {
    if (newSkill.trim()) {
      const requirements = formData.requirements || [];
      if (!requirements.includes(newSkill.trim())) {
        setFormData({
          ...formData,
          requirements: [...requirements, newSkill.trim()]
        });
        setNewSkill('');
      }
    }
  };

  const handleRemoveRequirement = (skill: string) => {
    setFormData({
      ...formData,
      requirements: (formData.requirements || []).filter(s => s !== skill)
    });
  };

  const handleSaveJob = async () => {
    if (!formData.title) {
      enqueueAlert({ message: 'Job title is required', textColor: 'text-yellow-300' });
      return;
    }

    try {
      const method = jobId ? 'PUT' : 'POST';
      const endpoint = jobId ? `/jobs/business/jobs/${jobId}` : '/jobs/business/jobs';

      const response = await fetch(`${AUTH_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        enqueueAlert({
          message: jobId ? 'Job updated successfully' : 'Job created successfully',
          textColor: 'text-green-300'
        });
        navigate('/business/dashboard');
      } else {
        enqueueAlert({ message: 'Failed to save job', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('Error saving job:', error);
      enqueueAlert({ message: 'Error saving job', textColor: 'text-red-300' });
    }
  };

  const handleViewApplicant = async (appId: number) => {
    try {
      const response = await fetch(
        `${AUTH_BASE_URL}/jobs/business/jobs/${jobId}/applicants/${appId}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentApplicant(data);
        setShowApplicantDetail(appId);
      }
    } catch (error) {
      console.error('Error fetching applicant details:', error);
      enqueueAlert({ message: 'Error loading applicant', textColor: 'text-red-300' });
    }
  };

  if (loading && jobId) {
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
      <div className="job-manager-container">
        <div className="manager-content">
          <div className="manager-section">
            <div className="section-header">
              <h1>{jobId ? 'Edit Job' : 'Create New Job'}</h1>
            </div>

            <form className="job-form">
              <div className="form-group">
                <label>Job Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  placeholder="Describe the role and responsibilities..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Job Type</label>
                  <select
                    value={formData.job_type || ''}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                  >
                    <option value="">Select job type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Salary Range</label>
                  <input
                    type="text"
                    value={formData.salary_range || ''}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                    placeholder="e.g., $60,000 - $80,000"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="filled">Filled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Required Skills</label>
                <div className="skills-input">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequirement())}
                    placeholder="Add a skill and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="btn-add-skill"
                  >
                    Add
                  </button>
                </div>
                {formData.requirements && formData.requirements.length > 0 && (
                  <div className="skills-list">
                    {formData.requirements.map((skill) => (
                      <div key={skill} className="skill-tag">
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(skill)}
                          className="remove-skill"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveJob}
                >
                  {jobId ? 'Update Job' : 'Create Job'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/business/dashboard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {jobId && applicants.length > 0 && (
            <div className="manager-section applicants-section">
              <h2>Applicants ({applicants.length})</h2>
              <div className="applicants-list">
                {applicants.map((applicant) => (
                  <div key={applicant.app_id} className="applicant-card">
                    <div className="applicant-header">
                      <div className="applicant-info">
                        <h3>{applicant.username}</h3>
                        <p>{applicant.email}</p>
                        <small>Applied: {new Date(applicant.applied_date).toLocaleDateString()}</small>
                      </div>
                      <span className={`status-badge ${applicant.status}`}>
                        {applicant.status}
                      </span>
                    </div>
                    <button
                      className="btn-view-applicant"
                      onClick={() => handleViewApplicant(applicant.app_id)}
                    >
                      View Profile & Resume
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showApplicantDetail && currentApplicant && (
          <div className="applicant-detail-modal">
            <div className="modal-content">
              <button
                className="modal-close"
                onClick={() => setShowApplicantDetail(null)}
              >
                ×
              </button>

              <div className="applicant-detail">
                <h2>{currentApplicant.username}</h2>
                <p className="applicant-email">{currentApplicant.email}</p>

                {currentApplicant.skills && currentApplicant.skills.length > 0 && (
                  <div className="detail-section">
                    <h3>Skills</h3>
                    <div className="skills-list">
                      {currentApplicant.skills.map((skill, idx) => (
                        <span key={idx} className="skill-badge">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {currentApplicant.resume_url && (
                  <div className="detail-section">
                    <a
                      href={currentApplicant.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-download-resume"
                    >
                      <Download size={18} /> Download Resume
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Body>
  );
};

export default BusinessJobManager;
