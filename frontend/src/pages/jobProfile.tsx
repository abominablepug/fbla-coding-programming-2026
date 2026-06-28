import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { Upload, Plus, X } from 'lucide-react';

const JobProfile = () => {
  const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173').trim();
  const navigate = useNavigate();
  const [_profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [education, setEducation] = useState<any[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setSkills(data.skills || []);
        setEducation(data.education || []);
        setResumeUrl(data.resume_url);
      } else if (response.status === 404) {
        setProfile(null);
        setSkills([]);
        setEducation([]);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updateData: any = {
        skills,
        education
      };

      if (resumeFile) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          updateData.resume_url = event.target?.result as string;
          await submitProfile(updateData);
        };
        reader.readAsDataURL(resumeFile);
      } else {
        await submitProfile(updateData);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const submitProfile = async (data: any) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/jobs/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        fetchProfile();
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <Body>
        <Navbar />
        <div className="relative z-10 flex items-center justify-center h-screen text-white">Loading...</div>
      </Body>
    );
  }

  return (
    <Body>
      <Navbar />
      <div className="relative z-10 max-w-2xl mx-auto p-6 pt-28">
        <div className="rounded-lg border border-cyan-200/16 bg-neutral-950/78 p-6 backdrop-blur-xl shadow-2xl shadow-black/25">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Your Job Profile</h1>
            {!editing && (
              <button
                className="rounded-full border border-cyan-300/45 bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-cyan-400 transition-colors"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Skills</h2>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Add a skill"
                    className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="rounded-lg bg-cyan-500 px-4 py-2 text-white shadow-lg hover:bg-cyan-400 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-50 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {skill}
                      <button onClick={() => handleRemoveSkill(skill)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Resume</h2>
                <label className="block border-2 border-dashed border-white/20 bg-white/5 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-400 transition-colors">
                  <Upload size={24} className="mx-auto mb-2 text-cyan-400" />
                  <span className="text-slate-300">Click to upload resume</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-white font-semibold shadow-lg hover:bg-cyan-400 transition-colors"
                >
                  Save Profile
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white font-semibold shadow-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Skills</h2>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <div
                        key={skill}
                        className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-50 px-3 py-1 rounded-full"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No skills added yet</p>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Resume</h2>
                {resumeUrl ? (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:text-cyan-400 underline"
                  >
                    View Resume
                  </a>
                ) : (
                  <p className="text-slate-400">No resume uploaded yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Body>
  );
};

export default JobProfile;
