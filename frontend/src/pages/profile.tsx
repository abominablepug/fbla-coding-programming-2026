import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Download,
  FileText,
  Heart,
  LockKeyhole,
  Map,
  MapPin,
  Moon,
  Route,
  Star,
  Sun,
  TicketPercent,
} from 'lucide-react';
import luminxLogoSvg from '../assets/luminx-logo.svg?raw';
import Body from '../components/body';
import Links from '../components/links';
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
  preferences?: Record<string, number | string>;
}

interface Location {
  lid: number;
  name: string;
  address?: string;
  longitude: number;
  latitude: number;
  type?: number;
  categories?: string[];
  visited_at?: string | null;
}

interface Review {
  location_id: number;
  location_name: string;
  star_rating: number;
  content?: string;
}

interface SavedCouponMeta {
  key: string;
  name: string;
  title: string;
  discountLabel: string;
  code: string;
  lid: number;
  sourceType: 'personal' | 'nearby';
  address?: string;
}

interface ReportData {
  generated_for: ProfileUser;
  favorite_locations: Location[];
  recently_visited_locations: Location[];
  reviews: Review[];
  preferences: Record<string, number | string>;
}

interface ReportOptions {
  favorites: boolean;
  visited: boolean;
  aiSuggestions: boolean;
  directions: boolean;
  savedCoupons: boolean;
  reviews: boolean;
  preferences: boolean;
  summary: boolean;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY ||
  import.meta.env.GOOGLE_MAPS_API_KEY;

const defaultReportOptions: ReportOptions = {
  favorites: true,
  visited: true,
  aiSuggestions: true,
  directions: true,
  savedCoupons: true,
  reviews: true,
  preferences: true,
  summary: true,
};


const formatDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const dedupeLocations = (locations: Location[]) => {
  const seen = new Set<string>();
  return locations.filter((loc) => {
    const key = loc.lid > 0
      ? `lid:${loc.lid}`
      : `${loc.name.toLowerCase()}|${loc.address || ''}|${loc.latitude}|${loc.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const categoryLabel = (loc: Location) => {
  const cat = loc.categories?.[0];
  if (!cat) return 'Local place';
  return cat.replace(/_/g, ' ').split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const buildAiSuggestions = (favorites: Location[], visits: Location[]) => {
  const favoriteIds = new Set(favorites.map((loc) => loc.lid));
  const visitCounts = visits.reduce<Record<number, number>>((acc, loc) => {
    acc[loc.lid] = (acc[loc.lid] || 0) + 1;
    return acc;
  }, {});

  return dedupeLocations([...favorites, ...visits])
    .map((loc) => {
      const category = categoryLabel(loc).toLowerCase();
      const categoryBoost =
        /(restaurant|food|cafe|coffee|pizza|bar)/.test(category) ? 0.9 :
        /(shopping|store|retail|mall)/.test(category) ? 0.75 :
        /(park|fitness|sports|outdoor|activity)/.test(category) ? 0.65 : 0.45;
      const score = Number((
        categoryBoost +
        (favoriteIds.has(loc.lid) ? 1.1 : 0.45) +
        Math.min(visitCounts[loc.lid] || 0, 4) * 0.35
      ).toFixed(2));
      return {
        ...loc,
        score,
        reason: favoriteIds.has(loc.lid)
          ? 'Strong match from favorites and recent activity.'
          : 'Suggested from recent visits and category behavior.',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
};

const getSavedCoupons = (uid?: number): SavedCouponMeta[] => {
  if (!uid) return [];
  try {
    const metaRaw = window.localStorage.getItem(`bizmatch_saved_coupon_meta_${uid}`);
    const parsed = metaRaw ? JSON.parse(metaRaw) : {};
    if (!parsed || typeof parsed !== 'object') return [];
    return Object.values(parsed).filter((coupon): coupon is SavedCouponMeta => {
      return Boolean(
        coupon &&
        typeof coupon === 'object' &&
        typeof (coupon as SavedCouponMeta).name === 'string' &&
        typeof (coupon as SavedCouponMeta).code === 'string'
      );
    });
  } catch {
    return [];
  }
};

const fetchDirectionsSummary = async (from?: Location, to?: Location) => {
  if (!GOOGLE_MAPS_API_KEY || !from || !to) return null;
  const url = new URL(
    `https://api.tomtom.com/routing/1/calculateRoute/${from.latitude},${from.longitude}:${to.latitude},${to.longitude}/json`
  );
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.set('instructionsType', 'tagged');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = await response.json();
    const route = data?.routes?.[0];
    const summary = route?.summary;
    const instructions = route?.guidance?.instructions || [];
    if (!summary) return null;
    return {
      from: from.name,
      to: to.name,
      distanceMiles: Number(summary.lengthInMeters || 0) / 1609.34,
      travelMinutes: Number(summary.travelTimeInSeconds || 0) / 60,
      instructions: instructions
        .map((item: any) => item?.message)
        .filter((message: unknown): message is string => typeof message === 'string')
        .slice(0, 8),
    };
  } catch {
    return null;
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const [openForm, setOpenForm] = useState(false);
	const [, setProfilePic] = useState<string>();
	const [pfpChange, setPfpChange] = useState(false);
	const [password, setPassword] = useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [pwSubmitError, setPwSubmitError] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
  const [popup,setPopup] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedCoupons, setSavedCoupons] = useState<SavedCouponMeta[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const [savingTheme, setSavingTheme] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);
  const [customNote, setCustomNote] = useState('');
  const [routeFromId, setRouteFromId] = useState<number | null>(null);
  const [routeToId, setRouteToId] = useState<number | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Handles handle logout logic and updates related state transitions safely.
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
        const [settingsRes, reportRes] = await Promise.all([
          fetch(`${AUTH_BASE_URL}/auth/profile/settings`, { credentials: 'include' }),
          fetch(`${AUTH_BASE_URL}/auth/profile/report_data`, { credentials: 'include' }),
        ]);
        if (!settingsRes.ok || !reportRes.ok) {
          navigate('/login');
          return;
        }
        const settings = await settingsRes.json();
        const data = await reportRes.json();
        if (cancelled) return;
        setUser(settings);
        setReportData(data);
        setThemeMode(settings.theme_mode || 'dark');
        applyThemeMode(settings.theme_mode || 'dark');
        setSavedCoupons(getSavedCoupons(Number(settings.uid)));
      } catch {
        if (!cancelled) navigate('/login');
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const favorites = reportData?.favorite_locations || [];
  const visited = reportData?.recently_visited_locations || [];
  const reviews = reportData?.reviews || [];
  const allLocations = useMemo(() => dedupeLocations([...favorites, ...visited]), [favorites, visited]);
  const aiSuggestions = useMemo(() => buildAiSuggestions(favorites, visited), [favorites, visited]);
  const profileImage = `${AUTH_BASE_URL}/static/profile_pictures/${user?.profile_picture || 'default_profile_picture.png'}`;
  const selectedFrom = allLocations.find((loc) => loc.lid === routeFromId) || visited[0] || favorites[0];
  const selectedTo = allLocations.find((loc) => loc.lid === routeToId) || favorites[0] || visited[1] || visited[0];

  useEffect(() => {
    if (!routeFromId && allLocations[0]) setRouteFromId(allLocations[0].lid);
    if (!routeToId && allLocations[1]) setRouteToId(allLocations[1].lid);
  }, [allLocations, routeFromId, routeToId]);

  const handleFileChange = async (formData: FormData) => {
		try {
			const response = await fetch(`${AUTH_BASE_URL}/auth/change_picture`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setProfilePic(data.profile_picture);
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

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const addPdfHeader = (doc: jsPDF) => {
    doc.setFillColor(8, 13, 24);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setDrawColor(45, 212, 191);
    doc.setLineWidth(0.5);
    doc.line(14, 31.5, 196, 31.5);

    try {
      (doc as any).addSvgAsImage(luminxLogoSvg, 14, 7, 18, 18);
    } catch {
      doc.setDrawColor(45, 212, 191);
      doc.circle(23, 16, 7, 'S');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 255, 250);
    doc.setFontSize(19);
    doc.text('LuminX', 36, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(153, 246, 228);
    doc.text('Profile Report', 36, 22);
    doc.setTextColor(230, 255, 250);
    doc.text(formatDate(new Date().toISOString()), 196, 18, { align: 'right' });
  };

  const addPdfFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setDrawColor(214, 232, 240);
      doc.line(14, 286, 196, 286);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(92, 115, 135);
      doc.text(`LuminX account data export | Page ${page} of ${pageCount}`, 14, 292);
      doc.text(user?.username || '', 196, 292, { align: 'right' });
    }
  };

  const ensurePdfSpace = (doc: jsPDF, y: number, needed = 14) => {
    if (y + needed <= 276) return y;
    doc.addPage();
    addPdfHeader(doc);
    return 42;
  };

  const addPdfLine = (doc: jsPDF, text: string, y: number, indent = 18, maxWidth = 174) => {
    const lines = doc.splitTextToSize(text, maxWidth - (indent - 18));
    let nextY = y;
    lines.forEach((line: string) => {
      nextY = ensurePdfSpace(doc, nextY, 7);
      doc.text(line, indent, nextY);
      nextY += 6;
    });
    return nextY;
  };

  const addPdfSection = (doc: jsPDF, title: string, y: number, accent: [number, number, number] = [8, 89, 107]) => {
    y = ensurePdfSpace(doc, y, 18);
    doc.setFillColor(244, 248, 251);
    doc.roundedRect(14, y - 5, 182, 13, 2, 2, 'F');
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.roundedRect(14, y - 5, 3, 13, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(7, 17, 31);
    doc.setFontSize(12);
    doc.text(title, 21, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(39, 57, 73);
    return y + 16;
  };

  const addPdfMetricRow = (doc: jsPDF, y: number, metrics: Array<[string, string | number]>) => {
    const width = 182 / metrics.length;
    metrics.forEach(([label, value], index) => {
      const x = 14 + index * width;
      doc.setFillColor(236, 248, 250);
      doc.roundedRect(x, y, width - 3, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(8, 89, 107);
      doc.text(String(value), x + 5, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(92, 115, 135);
      doc.text(label.toUpperCase(), x + 5, y + 14);
    });
    return y + 26;
  };

  const addPdfItem = (doc: jsPDF, y: number, title: string, detail?: string, meta?: string) => {
    y = ensurePdfSpace(doc, y, detail ? 22 : 14);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, y - 5, 174, detail ? 18 : 12, 2, 2, 'F');
    doc.setDrawColor(223, 235, 242);
    doc.roundedRect(18, y - 5, 174, detail ? 18 : 12, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(7, 17, 31);
    doc.text(title, 23, y);
    if (meta) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(8, 89, 107);
      doc.text(meta, 187, y, { align: 'right' });
    }
    if (detail) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(92, 115, 135);
      const lines = doc.splitTextToSize(detail, 158);
      doc.text(lines.slice(0, 2), 23, y + 6);
    }
    return y + (detail ? 23 : 16);
  };

  const downloadReport = async () => {
    if (!reportData || !user) return;
    setGeneratingReport(true);
    try {
      const doc = new jsPDF();
      addPdfHeader(doc);
      doc.setFillColor(250, 253, 255);
      doc.rect(0, 32, 210, 265, 'F');
      let y = 44;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(39, 57, 73);
      y = addPdfLine(doc, `Prepared for ${user.username} (${user.email}). This report includes the account data selected in the profile report builder.`, y);
      if (customNote.trim()) y = addPdfLine(doc, `Report note: ${customNote.trim()}`, y + 2);
      y = addPdfMetricRow(doc, y + 3, [
        ['Favorites', favorites.length],
        ['Recent Visits', visited.length],
        ['Saved Coupons', savedCoupons.length],
        ['Reviews', reviews.length],
      ]);

      if (options.summary) {
        y = addPdfSection(doc, 'Account Overview', y + 2);
        y = addPdfLine(doc, `Theme preference: ${themeMode}`, y);
        y = addPdfLine(doc, `Included sections: ${Object.entries(options).filter(([, enabled]) => enabled).map(([key]) => key.replace(/([A-Z])/g, ' $1')).join(', ')}`, y);
      }

      if (options.favorites) {
        y = addPdfSection(doc, 'Favorited Locations', y + 4, [13, 148, 136]);
        y = favorites.length ? y : addPdfLine(doc, 'No favorite locations saved yet.', y);
        favorites.forEach((loc, index) => {
          y = addPdfItem(doc, y, `${index + 1}. ${loc.name}`, loc.address || 'No address saved', categoryLabel(loc));
        });
      }

      if (options.visited) {
        y = addPdfSection(doc, 'Recently Visited Locations', y + 4, [124, 58, 237]);
        y = visited.length ? y : addPdfLine(doc, 'No recently visited locations recorded yet.', y);
        visited.slice(0, 30).forEach((loc, index) => {
          y = addPdfItem(doc, y, `${index + 1}. ${loc.name}`, loc.address || 'No address saved', `Visited ${formatDate(loc.visited_at)}`);
        });
      }

      if (options.aiSuggestions) {
        y = addPdfSection(doc, 'AI Suggested Locations', y + 4, [14, 165, 183]);
        y = aiSuggestions.length ? y : addPdfLine(doc, 'AI suggestions need favorites or recent visits to build from.', y);
        aiSuggestions.forEach((loc, index) => {
          y = addPdfItem(doc, y, `${index + 1}. ${loc.name}`, loc.reason, `Fit ${loc.score}/3.4`);
        });
      }

      if (options.directions) {
        y = addPdfSection(doc, 'Directions', y + 4, [8, 127, 140]);
        const directions = await fetchDirectionsSummary(selectedFrom, selectedTo);
        if (directions) {
          y = addPdfLine(doc, `${directions.from} to ${directions.to}: ${directions.distanceMiles.toFixed(1)} mi, about ${Math.round(directions.travelMinutes)} min.`, y);
          directions.instructions.forEach((instruction: string, index: number) => {
            y = addPdfItem(doc, y, `${index + 1}. ${instruction}`);
          });
        } else {
          y = addPdfLine(doc, 'Directions could not be retrieved. Select two saved or visited locations and make sure the TomTom API key is configured.', y);
        }
      }

      if (options.savedCoupons) {
        y = addPdfSection(doc, 'Saved Coupons', y + 4, [14, 164, 127]);
        y = savedCoupons.length ? y : addPdfLine(doc, 'No saved coupons found for this browser account.', y);
        savedCoupons.forEach((coupon, index) => {
          y = addPdfItem(doc, y, `${index + 1}. ${coupon.discountLabel} at ${coupon.name}`, `${coupon.title} | Code: ${coupon.code}`, coupon.sourceType);
        });
      }

      if (options.reviews) {
        y = addPdfSection(doc, 'Your Reviews', y + 4, [168, 85, 247]);
        y = reviews.length ? y : addPdfLine(doc, 'No reviews submitted yet.', y);
        reviews.forEach((review, index) => {
          y = addPdfItem(doc, y, `${index + 1}. ${review.location_name}`, review.content || 'No written review', `${review.star_rating}/5`);
        });
      }

      if (options.preferences) {
        y = addPdfSection(doc, 'Backend Preference Signals', y + 4, [8, 89, 107]);
        Object.entries(reportData.preferences || {})
          .filter(([key]) => key !== 'theme_mode')
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, value]) => {
            y = addPdfLine(doc, `${key.replace(/_/g, ' ')}: ${value}`, y);
          });
      }

      addPdfFooter(doc);
      doc.save(`luminx-${user.username}-profile-report.pdf`);
      enqueueAlert({ message: 'Profile report downloaded.', textColor: 'text-green-300' });
    } catch (error) {
      enqueueAlert({ message: 'Unable to generate the report right now.', textColor: 'text-red-300' });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!user || !reportData) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading profile...</div>;
  }

  const isBusiness = user.user_type === 'business';

  return (
    <Body>
      <Navbar page="Profile">
        {!isBusiness && (
          <>
            <Links link="/map">Map <MapPin size={17} /></Links>
            <Links link="/discount">Coupons <TicketPercent size={17} /></Links>
            <Links link="/reviews">Reviews <Star size={17} /></Links>
          </>
        )}
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
                      <button className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors inline-block mr-3" onClick={() => {setOpenForm(true); setPfpChange(false);}}>Change Password</button>
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
          <div className={`grid gap-0 ${!isBusiness ? 'lg:grid-cols-[0.85fr_1.15fr]' : 'lg:grid-cols-1'}`}>
            <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-4">
                <img
                  src={profileImage}
                  alt={`${user.username} profile`}
                  className="h-24 w-24 rounded-lg border border-cyan-200/30 object-cover shadow-lg"
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
              {!isBusiness && (
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    ['Favorites', favorites.length],
                    ['Visits', visited.length],
                    ['Coupons', savedCoupons.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                      <p className="text-xl font-bold text-cyan-200">{value}</p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}
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
            {!isBusiness && (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Location Overview</p>
                    <h2 className="text-2xl font-bold text-white">Activity Orbit</h2>
                  </div>
                  <Map className="text-cyan-200" size={28} />
                </div>
                {allLocations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-cyan-200/25 bg-white/5 p-6 text-center text-sm text-gray-300">
                    Favorites and visits will appear here after you explore locations.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {dedupeLocations([...favorites.slice(0, 4), ...visited.slice(0, 4)]).slice(0, 6).map((loc, index) => (
                      <div
                        key={`${loc.lid}-${index}`}
                        className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-cyan-200/30 hover:bg-white/8"
                      >
                        <div className="absolute right-3 top-3 h-8 w-8 rounded-md border border-cyan-200/20 bg-cyan-300/10 text-center text-xs font-bold leading-8 text-cyan-200">
                          {index + 1}
                        </div>
                        <p className="pr-12 text-sm font-semibold text-white">{loc.name}</p>
                        <p className="pr-12 mt-1 line-clamp-2 text-xs text-gray-400">{loc.address || 'No address saved'}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                          {favorites.some((fav) => fav.lid === loc.lid) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-1 text-cyan-200">
                              <Heart size={12} /> Favorite
                            </span>
                          )}
                          {visited.some((visit) => visit.lid === loc.lid) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-400/10 px-2 py-1 text-purple-200">
                              <Route size={12} /> Visited
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {!isBusiness && (
          <section className="grid \">

            <div className="rounded-lg border border-cyan-200/16 bg-neutral-950/72 p-5 backdrop-blur-xl light:bg-white/70">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-cyan-200" />
                  <h2 className="text-xl font-bold text-white">Report Builder</h2>
                </div>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-gray-300">
                  PDF export
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(options) as Array<keyof ReportOptions>).map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 transition hover:border-cyan-200/30">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={() => toggleOption(key)}
                      className="h-4 w-4 accent-cyan-500"
                    />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={customNote}
                onChange={(event) => setCustomNote(event.target.value)}
                placeholder="Optional note for the report"
                className="mt-3 min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={routeFromId || ''}
                  onChange={(event) => setRouteFromId(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white"
                >
                  {allLocations.map((loc) => <option key={`from-${loc.lid}`} value={loc.lid}>{loc.name}</option>)}
                </select>
                <select
                  value={routeToId || ''}
                  onChange={(event) => setRouteToId(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white"
                >
                  {allLocations.map((loc) => <option key={`to-${loc.lid}`} value={loc.lid}>{loc.name}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={downloadReport}
                disabled={generatingReport}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60"
              >
                <Download size={17} />
                {generatingReport ? 'Generating PDF...' : 'Download PDF Report'}
              </button>
            </div>
          </section>
        )}
      </main>
    </Body>
  );
};

export default Profile;
