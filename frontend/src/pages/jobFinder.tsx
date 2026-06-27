import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Card from '../components/card';
import Body from '../components/body';
import Links from '../components/links';
import { HeartPlus, X, MapPin, Briefcase, DollarSign, UserRound, Plus, Upload, FileCheck } from 'lucide-react';
import { enqueueAlert } from '../components/alerts';

interface Job {
  job_id: number;
  title: string;
  description: string;
  requirements: string[];
  salary_range: string;
  job_type: string;
  location: string;
  longitude: number | null;
  latitude: number | null;
  business_name: string;
  business_id: number;
  distance_miles: number | null;
  score: number;
  posted_date: string;
}

const JobFinder = () => {
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  // Job ids the user has already swiped on (skipped or applied). We never show
  // these again, even after a re-rank pulls a fresh list from the backend.
  const [decidedIds, setDecidedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('bizmatch_decided_jobs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [edgeGlow, setEdgeGlow] = useState<'left' | 'right' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: 34.0731, lng: -118.4016 });

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const processedSwipeRef = useRef<string | null>(null);

  // Jobs left to show = fetched jobs minus the ones already decided on.
  const remainingJobs = jobs.filter((j) => !decidedIds.has(j.job_id));
  const currentJob = remainingJobs[0];

  // Load saved profile skills (if any) on mount so swiping starts matched.
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`${AUTH_BASE_URL}/jobs/profile`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.skills)) setSkills(data.skills);
          if (data.resume_url) setResumeName('Resume on file');
        } else if (res.status === 401) {
          navigate('/login');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
    loadProfile();
  }, [AUTH_BASE_URL, navigate]);

  // Get location once, then fetch jobs.
  useEffect(() => {
    const handleLocation = (lat: number, lng: number) => {
      const coords = { lat, lng };
      setUserLoc(coords);
      fetchJobs(coords, skills);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleLocation(pos.coords.latitude, pos.coords.longitude),
        () => handleLocation(34.0731, -118.4016),
        { timeout: 10000 }
      );
    } else {
      handleLocation(34.0731, -118.4016);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async (coords: { lat: number; lng: number }, useSkills: string[]) => {
    setError(null);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/ranked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          radius_mi: 50,
          skills: useSkills
        })
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.ranked_jobs || []);
        processedSwipeRef.current = null;
      } else if (response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load jobs. Make sure you are logged in.');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Error fetching jobs. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (side: 'left' | 'right') => {
    setEdgeGlow(side);
    setTimeout(() => setEdgeGlow(null), 600);
  };

  const triggerSwipe = (side: 'left' | 'right') => {
    if (swipeDirection || !currentJob) return;
    setSwipeDirection(side);
    handlePress(side);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') triggerSwipe('left');
      else if (e.key === 'ArrowRight') triggerSwipe('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob, swipeDirection]);

  const applyToJob = async (job: Job) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_id: job.job_id })
      });

      if (response.ok) {
        enqueueAlert({ message: `Applied to ${job.title}!`, textColor: 'text-green-300' });
      } else if (response.status === 400) {
        enqueueAlert({ message: 'Already applied to this job.', textColor: 'text-yellow-300' });
      } else {
        enqueueAlert({ message: 'Failed to apply.', textColor: 'text-red-300' });
      }
    } catch (err) {
      console.error('Error applying to job:', err);
      enqueueAlert({ message: 'Error applying to job.', textColor: 'text-red-300' });
    }
  };

  const handleAnimationComplete = async () => {
    if (!swipeDirection || !currentJob) return;

    const swipeKey = `${currentJob.job_id}-${swipeDirection}`;
    if (processedSwipeRef.current === swipeKey) return;
    processedSwipeRef.current = swipeKey;

    if (swipeDirection === 'right') {
      await applyToJob(currentJob);
    }

    setDecidedIds((prev) => {
      const next = new Set(prev);
      next.add(currentJob.job_id);
      try {
        localStorage.setItem('bizmatch_decided_jobs', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    setSwipeDirection(null);
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleApplySkills = () => {
    setLoading(true);
    fetchJobs(userLoc, skills);
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const resume_url = event.target?.result as string;
        const response = await fetch(`${AUTH_BASE_URL}/jobs/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ resume_url })
        });

        if (response.ok) {
          setResumeName(file.name);
          enqueueAlert({ message: 'Resume uploaded! It will be sent with your applications.', textColor: 'text-green-300' });
        } else if (response.status === 401) {
          navigate('/login');
        } else {
          enqueueAlert({ message: 'Failed to upload resume.', textColor: 'text-red-300' });
        }
      } catch (err) {
        console.error('Error uploading resume:', err);
        enqueueAlert({ message: 'Error uploading resume.', textColor: 'text-red-300' });
      } finally {
        setUploadingResume(false);
      }
    };
    reader.onerror = () => {
      setUploadingResume(false);
      enqueueAlert({ message: 'Could not read that file.', textColor: 'text-red-300' });
    };
    reader.readAsDataURL(file);
  };

  const titleCase = (str: string) =>
    str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Show the empty "No Job Openings" card once loading is finished and there is
  // nothing left to swipe on (no jobs at all, or all of them decided).
  const showEmptyCard = !loading && !error && !currentJob;

  return (
    <Body className="overscroll-none">
      <Navbar page="Job Findr">
        <Links link="/jobs/profile">
          My Profile <UserRound size={18} />
        </Links>
      </Navbar>

      {/* Swipe edge glow */}
      <AnimatePresence>
        {edgeGlow === 'right' && (
          <motion.div
            key="right-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 2, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 right-0 w-[350px] pointer-events-none z-30"
          >
            <div className="absolute right-[-200px] top-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-gradient-to-l from-green-500/40 to-transparent blur-[160px] rounded-full" />
          </motion.div>
        )}
        {edgeGlow === 'left' && (
          <motion.div
            key="left-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 2, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 left-0 w-[350px] pointer-events-none z-30"
          >
            <div className="absolute left-[-200px] top-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-gradient-to-r from-red-500/40 to-transparent blur-[160px] rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="z-10 pt-28 pb-40 min-h-screen flex flex-col items-center">
        {/* Skills bar */}
        <div className="relative z-40 w-full max-w-[1120px] px-4 mb-8">
          <div className="rounded-2xl border border-[#FFBF65]/35 bg-neutral-900/55 p-4 shadow-lg backdrop-blur-sm">
            <p className="text-[#FFBF65] text-sm font-semibold mb-3">
              Your skills — jobs are ranked by how well they match. Edit and re-rank anytime.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill (e.g., Python, Customer Service)"
                className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={handleAddSkill}
                className="px-4 py-2 bg-[#FFBF65] hover:bg-[#f0a93f] text-[#13181B] font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus size={18} /> Add
              </button>
              <button
                onClick={handleApplySkills}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-semibold"
              >
                Re-rank
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <div key={skill} className="bg-cyan-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))
              ):""}
            </div>

            {/* Resume upload */}
            <div className="mt-4 pt-4 border-t border-[#CCD5DA]/25 flex flex-wrap items-center gap-3">
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-white font-semibold ${uploadingResume ? 'bg-slate-600 cursor-wait' : 'bg-[#FD8973] hover:bg-[#fb5f43]'}`}>
                <Upload size={18} />
                {uploadingResume ? 'Uploading...' : resumeName ? 'Replace Resume' : 'Upload Resume'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  disabled={uploadingResume}
                  className="hidden"
                />
              </label>
              {resumeName && (
                <span className="inline-flex items-center gap-2 text-emerald-300 text-sm">
                  <FileCheck size={16} /> {resumeName}
                </span>
              )}
              <span className="text-slate-400 text-xs">Your resume is sent automatically when you apply (swipe right).</span>
            </div>
          </div>
        </div>

        {/* Swipe hints */}
        

        {/* Job card */}
        <div className="w-full flex-1 flex items-start justify-center">
          <AnimatePresence>
            {currentJob && (
              <motion.div
                key={currentJob.job_id}
                initial={{ opacity: 0 }}
                animate={{
                  x: swipeDirection === 'left' ? -1000 : swipeDirection === 'right' ? 1000 : 0,
                  opacity: swipeDirection ? 0 : 1
                }}
                exit={{ opacity: 0 }}
                transition={{
                  x: { duration: 0.7 },
                  opacity: { duration: swipeDirection ? 0.25 : 0.35 }
                }}
                onAnimationComplete={handleAnimationComplete}
                className="w-full max-w-[1040px] px-4"
              >
                <Card
                  title={currentJob.title || 'Untitled Role'}
                  cardClassName="w-[1040px] max-w-[97vw]"
                  bgcolor="#003A6CFF"
                  titleClassName="text-white"
                >
                  <div className="space-y-4">
                    <p className="text-cyan-100 text-lg font-semibold">{currentJob.business_name}</p>

                    <div className="bg-white/10 p-5 rounded-xl border border-cyan-200/20 space-y-2">
                      <p className="text-white text-sm flex items-center gap-2">
                        <MapPin size={16} /> <strong>{currentJob.location || 'Location N/A'}</strong>
                        {currentJob.distance_miles != null && (
                          <span className="text-cyan-100/80">({currentJob.distance_miles.toFixed(1)} mi away)</span>
                        )}
                      </p>
                      {currentJob.salary_range && (
                        <p className="text-white text-sm flex items-center gap-2">
                          <DollarSign size={16} /> {currentJob.salary_range}
                        </p>
                      )}
                      {currentJob.job_type && (
                        <p className="text-white text-sm flex items-center gap-2">
                          <Briefcase size={16} /> {currentJob.job_type}
                        </p>
                      )}
                    </div>

                    {currentJob.description && (
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <p className="text-cyan-50 text-sm font-semibold mb-1">About this role</p>
                        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">{currentJob.description}</p>
                      </div>
                    )}

                    {currentJob.requirements && currentJob.requirements.length > 0 && (
                      <div>
                        <p className="text-cyan-50 text-sm font-semibold mb-2">Required Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {currentJob.requirements.map((skill, idx) => {
                            const matched = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
                            return (
                              <span
                                key={idx}
                                className={`px-3 py-1 rounded-full text-sm border ${
                                  matched
                                    ? 'bg-emerald-500/80 border-emerald-300/50 text-white'
                                    : 'bg-white/10 border-white/20 text-white/80'
                                }`}
                              >
                                {titleCase(skill)}{matched ? ' ✓' : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Empty state — shown on the card itself */}
            {showEmptyCard && (
              <motion.div
                key="no-jobs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[1040px] px-4"
              >
                <Card
                  title="No Job Openings"
                  cardClassName="w-[1040px] max-w-[97vw]"
                  bgcolor="#003A6CFF"
                  titleClassName="text-white"
                >
                  <div className="py-6 text-center space-y-4">
                    <p className="text-white/90">
                      {jobs.length === 0
                        ? 'There are no active job postings right now. Check back soon!'
                        : "You've gone through every available job opening."}
                    </p>
                    <button
                      onClick={handleApplySkills}
                      className="px-5 py-2 bg-[#FD8973] hover:bg-[#fb5f43] text-white rounded-lg font-semibold"
                    >
                      Reload Openings
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status messages */}
        {error ? (
          <p className="text-red-400 text-center mt-4">{error}</p>
        ) : loading && jobs.length === 0 ? (
          <p className="text-white text-center mt-4">Loading jobs...</p>
        ) : null}
      </div>

      {/* Swipe buttons */}
      {currentJob && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-16">
          <motion.button
            onClick={() => triggerSwipe('left')}
            animate={{ scale: swipeDirection === 'left' ? [1, 3, 1] : 1 }}
            transition={{ duration: 0.6, repeat: swipeDirection === 'left' ? 1 : 0, ease: 'easeInOut' }}
            className="cursor-pointer hover:scale-110 transition active:scale-125 focus:outline-none"
            aria-label="Skip"
          >
            <X size={130} className="text-red-500 drop-shadow-lg" />
          </motion.button>
          <motion.button
            onClick={() => triggerSwipe('right')}
            animate={{ scale: swipeDirection === 'right' ? [1, 3, 1] : 1 }}
            transition={{ duration: 0.6, repeat: swipeDirection === 'right' ? 1 : 0, ease: 'easeInOut' }}
            className="cursor-pointer hover:scale-110 transition active:scale-150 focus:outline-none"
            aria-label="Apply"
          >
            <HeartPlus size={110} className="text-[#2ecc71] drop-shadow-lg" />
          </motion.button>
        </div>
      )}
    </Body>
  );
};

export default JobFinder;
