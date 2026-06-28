import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  LockKeyhole,
  Moon,
  Sun,
} from 'lucide-react';
import Body from '../components/body';
import Navbar from '../components/navbar';
import { enqueueAlert } from '../components/alerts';
import {
  AUTH_BASE_URL,
  applyThemeMode,
  getInitialThemeMode,
  saveAccountThemeMode,
  type ThemeMode,
} from '../utils/theme';
import Card from "../components/card";

interface ProfileUser {
  uid: number;
  username: string;
  email: string;
  profile_picture?: string;
  theme_mode: ThemeMode;
  user_type?: 'customer' | 'business';
}

const BusinessProfile = () => {
  const navigate = useNavigate();
  const [openForm, setOpenForm] = useState(false);
  const [pfpChange, setPfpChange] = useState(false);
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pwSubmitError, setPwSubmitError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popup,setPopup] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const [savingTheme, setSavingTheme] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
  const [jobsCount, setJobsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [adsCount, setAdsCount] = useState(0);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch(`${AUTH_BASE_URL}/auth/logout`, {
        credentials: 'include'
      });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const [dashboardRes, jobsRes, eventsRes, adsRes] = await Promise.all([
          fetch(`${AUTH_BASE_URL}/auth/dashboard`, { credentials: 'include' }),
          fetch(`${AUTH_BASE_URL}/jobs/business/jobs`, { credentials: 'include' }),
          fetch(`${AUTH_BASE_URL}/events/business`, { credentials: 'include' }),
          fetch(`${AUTH_BASE_URL}/ads/business`, { credentials: 'include' })
        ]);

        if (!dashboardRes.ok) {
          navigate('/login');
          return;
        }
        const dashboardData = await dashboardRes.json();

        let jCount = 0, eCount = 0, aCount = 0;
        if (jobsRes.ok) {
          const d = await jobsRes.json();
          jCount = d.jobs?.length || 0;
        }
        if (eventsRes.ok) {
          const d = await eventsRes.json();
          eCount = d.events?.length || 0;
        }
        if (adsRes.ok) {
          const d = await adsRes.json();
          aCount = d?.length || 0;
        }

        if (cancelled) return;
        setUser(dashboardData);
        setJobsCount(jCount);
        setEventsCount(eCount);
        setAdsCount(aCount);
        setThemeMode(dashboardData.theme_mode || 'dark');
        applyThemeMode(dashboardData.theme_mode || 'dark');
      } catch {
        if (!cancelled) navigate('/login');
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleFileChange = async (formData: FormData) => {
		try {
			const response = await fetch(`${AUTH_BASE_URL}/auth/change_picture`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setUser((prev) =>
					prev ? { ...prev, profile_picture: data.profile_picture } : prev
				);
				setOpenForm(false);
				enqueueAlert({ message: "Profile picture updated.", textColor: "text-green-300" });
			} else {
				console.error('Failed to upload profile picture');
				enqueueAlert({ message: "Failed to update profile picture.", textColor: "text-red-300" });
			}
		} catch (error) {
			console.error('Error uploading profile picture:', error);
			enqueueAlert({ message: "Error uploading profile picture.", textColor: "text-red-300" });
		}
	};

	// Computes handle pw change output used by downstream rendering and actions.
	const handlePwChange = async (formData: FormData) => {
		try {
			setPwSubmitError('');
			if (!password || !confirmPassword) {
				setPwSubmitError('Please fill in all fields.');
				enqueueAlert({ message: "Fill in all password fields.", textColor: "text-red-300" });
				return;
			}
			const response = await fetch(`${AUTH_BASE_URL}/auth/change_password`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				setOpenForm(false);
				setPassword('');
				setConfirmPassword('');
				setCurrentPassword('');
				setPwSubmitError('');
				enqueueAlert({ message: "Password changed successfully.", textColor: "text-green-300" });
			}else {
				const errorData = await response.json();
				if (errorData.message === 'Current password is incorrect') {
					setPwSubmitError('Current password is incorrect');
					enqueueAlert({ message: "Current password is incorrect.", textColor: "text-red-300" });
				} else {
					console.error('Failed to change password. Try again.');
					setPassword('');
					setConfirmPassword('');
					setCurrentPassword('');
					enqueueAlert({ message: "Failed to change password.", textColor: "text-red-300" });
				}}
		} catch (error) {
			console.error('Error changing password:', error);
			enqueueAlert({ message: "Error changing password.", textColor: "text-red-300" });
		}
	};

	const isPasswordValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
	const doPasswordsMatch = password === confirmPassword;
	let content;

	if (pfpChange) {
		content = (
		<div className="flex flex-col items-center gap-4 max-w-fit">
			<form className="flex flex-col items-center gap-4" onSubmit={(e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			handleFileChange(formData);
			}}>
				<input className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all" type="file" accept='image/png' id="image" name="image"/>
				<div className="flex justify-center gap-2">
					<button className="px-3 py-1 rounded-full bg-cyan-500 text-white max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" type="submit">
						Upload New Picture
					</button>
					<button className="px-3 py-1 rounded-full bg-cyan-500 text-white max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
				</div>
			</form>
		</div>);
	}else{
		content = (
		<div className="flex flex-col items-center gap-4 max-w-fit">
			<form className="flex flex-col items-center gap-4" onSubmit={(e) => {
			   e.preventDefault();
			   const formData = new FormData(e.currentTarget);
			   handlePwChange(formData);
		   	}}>
				<div>
				<label className="block text-sm font-medium text-white-400">Current Password</label>
				<input
					type="password"
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
					placeholder="••••••••"
					value={currentPassword}
					name = "current_password"
					onChange={(e) => setCurrentPassword(e.target.value)}
				/>
				</div>
				<div>
				<label className="block text-sm font-medium text-white-400">New Password</label>
				<input
					type="password"
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
					placeholder="••••••••"
					value={password}
					name = "new_password"
					onChange={(e) => setPassword(e.target.value)}
				/>
				{password && (
					<p className={`text-xs mt-1 ${isPasswordValid ? 'text-green-400' : 'text-red-400'}`}>
						{isPasswordValid ? 'Strong password' : 'Password must be at least 8 characters long and contain both letters and numbers.'}
					</p>
				)}
				</div>
				<div>
					<label className="block text-sm font-medium text-white-400">Confirm Password</label>
					<input
						type="password"
						className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
						placeholder="••••••••"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
					{confirmPassword && (
						<p className={`text-xs mt-1 ${doPasswordsMatch ? 'text-green-400' : 'text-red-400'}`}>
							{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
						</p>
					)}
				</div>
				{pwSubmitError && <p className="text-red-400 text-sm text-center">{pwSubmitError}</p>}
			   <div className="flex justify-center gap-2">
				   <button className="px-3 py-1 rounded-full bg-cyan-500 text-white max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" type="submit">
					   Change Password
				   </button>
				   <button className="px-3 py-1 rounded-full bg-cyan-500 text-white max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
			   </div>
			</form>
		</div>);
	}
  const updateTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemeMode(mode);
    setSavingTheme(true);
    try {
      await saveAccountThemeMode(mode);
      enqueueAlert({ message: `${mode === 'dark' ? 'Dark' : 'Light'} mode saved to your account.`, textColor: 'text-green-300' });
    } catch (error) {
      enqueueAlert({ message: error instanceof Error ? error.message : 'Unable to save theme.', textColor: 'text-red-300' });
    } finally {
      setSavingTheme(false);
    }
  };

  const handlePopup = () => {
		setPopup(true);
	}

  const sendPasswordChangeEmail = async () => {
    setSendingPasswordEmail(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/change_password_email`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to send password change email.');
      enqueueAlert({ message: data?.message || 'Password change email sent.', textColor: 'text-green-300' });
    } catch (error) {
      enqueueAlert({ message: error instanceof Error ? error.message : 'Unable to send password change email.', textColor: 'text-red-300' });
    } finally {
      setSendingPasswordEmail(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading profile...</div>;
  }

  const profileImage = `${AUTH_BASE_URL}/static/profile_pictures/${user?.profile_picture || 'default_profile_picture.png'}`;

  return (
    <Body>
      <Navbar page="Profile">
      </Navbar>
      <main className="mx-auto grid w-[94%] max-w-7xl gap-5 pt-28 pb-16">
        {popup && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overscroll">
                  <Card title={(
                    <div className="grid grid-cols-2">
                    <h1 className={`text-2xl font-bold text-cyan-500 line-clamp-2`}>
                      Account Details
                    </h1>
                    <button className="ml-42 px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors" onClick={() => {setPopup(false); setOpenForm(false);}}>X</button>
                    </div>
                  )} cardClassName='w-lg'>
                  <div className="max-w-md w-full align-items-center justify-items-center">
                    <img  className="block aspect-square h-40 w-40 overflow-hidden rounded-full border-4 border-cyan-600 object-cover object-center shadow-w-auto mb-4 align-center" src={profileImage} alt="Profile" />
                    {!openForm&&(<div className="items-center align-items-center justify-center">
                      <button className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors inline-block" onClick={() => {setOpenForm(true); setPfpChange(true);}}>Change Profile Picture</button>
                    </div>)}
                    {openForm &&(
                      <div className={`flex flex-col items-center justify-center gap-4 mt-4 w-full`}>
                        {content}
                      </div>)
                    }
                  </div>
                  </Card>
                </div>
        )}
        <section className="overflow-hidden rounded-lg border border-cyan-200/16 bg-neutral-950/78 shadow-2xl shadow-black/25 backdrop-blur-xl light:bg-white/75">
          <div className="grid gap-0 lg:grid-cols-1">
            <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-4">
                <img
                  src={profileImage}
                  alt={`${user.username} profile`}
                  className="h-24 w-24 rounded-lg border border-cyan-200/30 object-cover shadow-lg cursor-pointer"
                  onClick={handlePopup}
                />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Profile Settings</p>
                  <h1 className="truncate text-3xl font-bold text-white">{user.username}</h1>
                  <p className="mt-1 truncate text-sm text-gray-300">{user.email}</p>
                </div>
                <div className="">
                    <button
                      onClick={handleLogout}
                      className="rounded-full border border-cyan-300/45 bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-cyan-400 transition-colors"
                    >
                      Logout →
                    </button>
						    	</div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ['Ads', adsCount],
                  ['Events', eventsCount],
                  ['Jobs', jobsCount],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xl font-bold text-cyan-200">{value}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 mb-4 rounded-lg border border-cyan-200/14 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {themeMode === 'dark' ? <Moon size={16} className="text-cyan-200" /> : <Sun size={16} className="text-cyan-200" />}
                    <span className="text-sm font-semibold text-white">Account Theme</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                    {savingTheme ? 'Saving...' : 'Saved'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['dark', 'light'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateTheme(mode)}
                      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold capitalize transition ${
                        themeMode === mode
                          ? 'border-cyan-300 bg-cyan-500/20 text-cyan-50'
                          : 'border-white/10 bg-white/5 text-gray-300 '
                      }`}
                    >
                      {mode === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                      {mode}
                      {themeMode === mode && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-cyan-200/12 bg-white/5 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <LockKeyhole className="text-cyan-200" size={16} />
                  <span className="text-sm font-semibold text-white">Password</span>
                </div>
                <p className="text-sm font-semibold text-white">Email verification required</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  Send a secure link to {user.email}. The password is changed only after that link is opened.
                </p>
                <button
                  type="button"
                  onClick={sendPasswordChangeEmail}
                  disabled={sendingPasswordEmail}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  <LockKeyhole size={16} />
                  {sendingPasswordEmail ? 'Sending email...' : 'Send Password Change Email'}
                </button>
              </div>
            </div>
            <div className="p-5 mt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Business Overview</p>
                  <h2 className="text-2xl font-bold text-white">Business Tools</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-cyan-200/16 bg-neutral-950/72 p-5 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white mb-2">Dashboard</h3>
                  <p className="text-sm text-gray-300 mb-4">Manage your business profile, view analytics, and update your business details.</p>
                  <button
                    onClick={() => navigate('/business/dashboard')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                  >
                    Open Business Dashboard
                  </button>
                </div>
                <div className="rounded-lg border border-cyan-200/16 bg-neutral-950/72 p-5 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white mb-2">Events & Posts</h3>
                  <p className="text-sm text-gray-300 mb-4">Create new events and manage job postings for your business.</p>
                  <button
                    onClick={() => navigate('/business/dashboard')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                  >
                    Manage Events
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Body>
  );
};

export default BusinessProfile;
