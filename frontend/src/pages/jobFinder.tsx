import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { Heart, X, MapPin, Briefcase, DollarSign } from 'lucide-react';

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
  business_name: string;
  business_id: number;
  distance_miles: number;
  score: number;
  posted_date: string;
}

const JobFinder = () => {
  const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173').trim();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: 34.0731, lng: -118.4016 });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(coords);
          fetchJobs(coords);
        },
        () => {
          fetchJobs({ lat: 34.0731, lng: -118.4016 });
        }
      );
    } else {
      fetchJobs({ lat: 34.0731, lng: -118.4016 });
    }
  }, []);

  const fetchJobs = async (coords: { lat: number; lng: number }) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/ranked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          radius_mi: 50,
          limit: 20
        })
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.ranked_jobs || []);
      } else if (response.status === 401) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (job: Job) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_id: job.job_id })
      });

      if (response.ok) {
        alert('Applied to job!');
      } else if (response.status === 400) {
        alert('Already applied to this job');
      }
    } catch (error) {
      console.error('Error applying to job:', error);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      handleApply(jobs[currentIndex]);
    }
    setCurrentIndex(currentIndex + 1);
  };

  if (loading) {
    return (
      <Body>
        <Navbar />
        <div className="flex items-center justify-center h-screen">Loading jobs...</div>
      </Body>
    );
  }

  if (jobs.length === 0 || currentIndex >= jobs.length) {
    return (
      <Body>
        <Navbar />
        <div className="flex items-center justify-center h-screen flex-col gap-4">
          <h2 className="text-2xl font-bold text-white">No more jobs</h2>
          <p className="text-slate-400">You've viewed all available jobs in your area!</p>
        </div>
      </Body>
    );
  }

  const currentJob = jobs[currentIndex];

  return (
    <Body>
      <Navbar />
      <div className="flex items-center justify-center min-h-screen p-4 pt-20">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-2">{currentJob.title}</h2>
              <p className="text-cyan-400 mb-4">{currentJob.business_name}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin size={18} />
                  <span>{currentJob.location}</span>
                  <span className="text-sm text-slate-500">({currentJob.distance_miles.toFixed(1)} mi)</span>
                </div>
                {currentJob.salary_range && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <DollarSign size={18} />
                    <span>{currentJob.salary_range}</span>
                  </div>
                )}
                {currentJob.job_type && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase size={18} />
                    <span>{currentJob.job_type}</span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">About this role</h3>
                <p className="text-slate-300">{currentJob.description}</p>
              </div>

              {currentJob.requirements && currentJob.requirements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentJob.requirements.map((skill, idx) => (
                      <span key={idx} className="bg-cyan-500 text-white px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={() => handleSwipe('left')}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full"
              title="Skip this job"
            >
              <X size={24} />
            </button>
            <button
              onClick={() => handleSwipe('right')}
              className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-full"
              title="Apply to this job"
            >
              <Heart size={24} />
            </button>
          </div>

          <div className="text-center mt-4 text-slate-400 text-sm">
            Job {currentIndex + 1} of {jobs.length}
          </div>
        </div>
      </div>
    </Body>
  );
};

export default JobFinder;
