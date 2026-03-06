import React, { useEffect, useMemo, useRef, useState } from 'react';
import Card from "../components/card";
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import { ArrowUp, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Heart, HeartMinus, HeartPlus, MapPin, Star, TicketPercent } from 'lucide-react';
import Body from '../components/body';
import { enqueueAlert } from '../components/alerts';
import LocalAiChatPopup from '../components/localAiChatPopup';
import {
	fetchTomTomPoiDetailsForLocation,
	formatBusinessHoursForDisplay,
	serializeBusinessHours,
	serializeSocials,
	type SocialLink,
} from '../utils/tomtomPoiDetails';
import { getSampleGoogleReviewsForLocation } from '../utils/googleReviews';
import { resolveLocationId } from '../utils/locationResolver';

interface Location {
	lid: number;
	name: string;
	longitude: number;
	latitude: number;
	type: number;
	address?: string;
	categories?: string[];
	time?: string;
	visited_at?: string;
	phone?: string;
	email?: string;
	website?: string;
	businessHours?: string[];
	socials?: SocialLink[];
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

interface AiLocationSuggestion {
	loc: Location;
	score: number;
	reason: string;
}

interface BackendReview {
	user_id: number;
	username: string;
	star_rating: number;
	content: string;
}

interface AiCouponSuggestion {
	location: Location;
	title: string;
	discountLabel: string;
	code: string;
	reason: string;
}

interface OnboardingStep {
	title: string;
	description: string;
	buttonNotes: string;
	quickActions: string[];
	navigationTips: string[];
}

const dedupeDashboardLocations = (locations: Location[]): Location[] => {
	const seen = new Set<string>();
	return locations.filter((loc) => {
		const key = loc.lid > 0
			? `lid:${loc.lid}`
			: `${(loc.name || '').trim().toLowerCase()}|${(loc.address || '').trim().toLowerCase()}|${loc.latitude}|${loc.longitude}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const dedupeStrings = (values: string[]): string[] => Array.from(new Set(values));
const reviewStars = (rating: number) => '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))));
const APP_ONBOARDING_STEPS: OnboardingStep[] = [
	{
		title: 'Dashboard',
		description: 'See favorites, saved coupons, recently visited locations, and AI suggestions.',
		buttonNotes: 'Use `Review`, `Coupon`, map route buttons, and carousel arrows to navigate content.',
		quickActions: [
			'Use `Review` on location cards to open full-screen Google + community review popups.',
			'Use `Coupon` buttons to jump directly to coupon offers for a specific location.',
			'Use route/map buttons on cards to open the destination directly in the Map page.',
			'Use save/unsave buttons to manage saved coupons and favorites quickly.',
		],
		navigationTips: [
			'Top navbar links take you to Map, Findr, Coupons, and Reviews from any screen.',
			'AI cards auto-advance and support left/right arrows for manual selection.',
			'Scroll inside each dashboard card to view more items when list length increases.',
		],
	},
	{
		title: 'Map',
		description: 'Search locations, pick a POI category, and route to destinations with live navigation.',
		buttonNotes: 'Use search, mic input, POI filters, and `Navigate` to start turn-by-turn directions.',
		quickActions: [
			'Type in search or tap the mic button to voice-search a destination.',
			'Use rating, open-now, and coupon filters before and after selecting POIs.',
			'Tap any POI card or marker to preview details, reviews, and route options.',
			'Use `Voice On` in navigation for spoken step-by-step directions.',
		],
		navigationTips: [
			'Use POI sidebar filters to refine results without reselecting the POI category.',
			'Use Favorite sidebar and POI sidebar toggles to manage on-map clutter.',
			'Start navigation from route cards, then step through route instructions.',
		],
	},
	{
		title: 'Findr',
		description: 'Swipe through location cards and quickly favorite places you like.',
		buttonNotes: 'Use left/right swipe actions and `Reviews` on cards for quick details.',
		quickActions: [
			'Swipe right (or tap the heart-plus control) to favorite a location.',
			'Swipe left (or tap X) to skip to the next location.',
			'Use the reviews button on each card to inspect ratings before you decide.',
			'Open the favorites sidebar to revisit saved locations from Findr.',
		],
		navigationTips: [
			'Use route/open-map actions from saved locations to jump into navigation.',
			'Cards are designed for quick triage: details first, then like or skip.',
			'Keep swiping to improve recommendation quality over time.',
		],
	},
	{
		title: 'Coupons',
		description: 'Browse personal and nearby coupons and save ones you want to use later.',
		buttonNotes: 'Use `Review`, `Route`, and bookmark buttons to manage offers.',
		quickActions: [
			'Use `Review` to inspect location sentiment before using an offer.',
			'Use `Route` to open the coupon location directly in Map.',
			'Use bookmark/save controls to keep coupons in your saved list.',
			'Use section toggles to collapse or expand nearby vs personal coupons.',
		],
		navigationTips: [
			'Saved coupons remain accessible in the saved sidebar for quick retrieval.',
			'Coupon cards include discount code, expiration, and source context.',
			'Use navbar navigation to compare coupons with reviews and map data.',
		],
	},
	{
		title: 'Reviews',
		description: 'Pick a location, view Google/community feedback, and submit your own review.',
		buttonNotes: 'Use half-star rating input, AI review helper, and `Submit Rating & Review`.',
		quickActions: [
			'Select a location from favorites or recently visited to review it.',
			'Use half-star precision when setting your rating.',
			'Use the AI helper to draft review text, then edit before submitting.',
			'Submit your rating and text so other users can see community feedback.',
		],
		navigationTips: [
			'You can compare Google review samples with in-app community reviews.',
			'Your latest review for a location is preloaded when available.',
			'Use map/findr/coupons pages to gather context, then return to submit.',
		],
	},
];

const API_KEY =
	import.meta.env.VITE_TOMTOM_API_KEY ||
	import.meta.env.PUBLIC_TOMTOM_API_KEY ||
	import.meta.env.TOMTOM_API_KEY;
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
const LocationDetailBlock = ({ loc }: { loc: Location }) => {
	const formattedHours = formatBusinessHoursForDisplay(loc.businessHours, 2);

	return (
		<div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] leading-snug">
			<div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
				Phone: {loc.phone || 'N/A'}
			</div>
			<div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
				Email: {loc.email || 'N/A'}
			</div>
				<div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
					Website:{' '}
				{loc.website ? (
					<a
						href={loc.website}
						target="_blank"
						rel="noopener noreferrer"
						className="text-cyan-300 hover:text-cyan-200 underline break-all"
						onClick={(e) => e.stopPropagation()}
					>
						Open
					</a>
					) : 'N/A'}
				</div>
				<div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
					Hours: {formattedHours.length > 0 ? formattedHours.join(' | ') : 'N/A'}
				</div>
			</div>
		);
};

const CompactLocationMeta = ({ loc }: { loc: Location }) => {
	const hours = formatBusinessHoursForDisplay(loc.businessHours, 1);
	const websiteLabel = loc.website ? 'Available' : 'N/A';

	return (
		<div className="mt-2.5 space-y-1.5">
			<div className="grid grid-cols-3 gap-1.5 text-[10px]">
				<p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400 line-clamp-2">
					Phone: {loc.phone || 'N/A'}
				</p>
				<p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400 line-clamp-2">
					Email: {loc.email || 'N/A'}
				</p>
				<p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400 line-clamp-2">
					Website: {websiteLabel}
				</p>
			</div>
			<p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-400 line-clamp-2">
				Hours: {hours.length > 0 ? hours.join(' | ') : 'N/A'}
			</p>
		</div>
	);
};

const Dashboard = () => {
	const [user, setUser] = useState<{ uid: string, username: string } | null>(null);
	const navigate = useNavigate();
	const [openForm, setOpenForm] = useState(false);
	const [profilePic, setProfilePic] = useState<string>();
	const [pfpChange, setPfpChange] = useState(false);
	const [password, setPassword] = useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [pwSubmitError, setPwSubmitError] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
	const [loadingFavorites, setLoadingFavorites] = useState(false);
	const [loadingVisited, setLoadingVisited] = useState(false);
	const [visitedLocations, setVisitedLocations] = useState<Location[]>([]);
	const [visitedHistory, setVisitedHistory] = useState<Location[]>([]);
	const imageSrc = `http://localhost:5173/static/profile_pictures/${profilePic}`;
	const [popup,setPopup] = useState(false);
	const [showFavoritesSidebar, setShowFavoritesSidebar] = useState(false);
	const [savedCouponKeys, setSavedCouponKeys] = useState<string[]>([]);
	const [savedCouponMeta, setSavedCouponMeta] = useState<Record<string, SavedCouponMeta>>({});
	const [aiLocationSlide, setAiLocationSlide] = useState(1);
	const [aiCouponSlide, setAiCouponSlide] = useState(1);
	const aiLocationCarouselRef = useRef<HTMLDivElement | null>(null);
	const aiCouponCarouselRef = useRef<HTMLDivElement | null>(null);
	const favoriteSectionRef = useRef<HTMLDivElement | null>(null);
	const savedCouponsSectionRef = useRef<HTMLDivElement | null>(null);
	const recentSectionRef = useRef<HTMLDivElement | null>(null);
	const aiSectionRef = useRef<HTMLDivElement | null>(null);
	const [aiReviewModalLocation, setAiReviewModalLocation] = useState<Location | null>(null);
	const [aiReviewModalLoading, setAiReviewModalLoading] = useState(false);
	const [aiReviewModalReviews, setAiReviewModalReviews] = useState<BackendReview[]>([]);
	const [aiReviewModalResolvedLid, setAiReviewModalResolvedLid] = useState<number | null>(null);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
	const [showScrollTopButton, setShowScrollTopButton] = useState(false);
	const aiReviewModalGoogleReviews = useMemo(
		() =>
			aiReviewModalLocation
				? getSampleGoogleReviewsForLocation({
						lid: aiReviewModalLocation.lid,
						name: aiReviewModalLocation.name,
						address: aiReviewModalLocation.address,
				  })
				: [],
		[aiReviewModalLocation]
	);
	const onboardingStep = APP_ONBOARDING_STEPS[onboardingStepIndex] || APP_ONBOARDING_STEPS[0];
	
	const fetchFavoriteLocations = async () => {
		setLoadingFavorites(true);
		try {
			const response = await fetch('http://localhost:5173/loc/favorites', {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				if (!API_KEY) {
					setFavoriteLocations(dedupeDashboardLocations(data));
				} else {
					const enriched = await Promise.all(
						data.map(async (loc: Location) => {
							const details = await fetchTomTomPoiDetailsForLocation(API_KEY, {
								name: loc.name,
								address: loc.address,
								latitude: loc.latitude,
								longitude: loc.longitude
							});
							return { ...loc, ...details };
						})
					);
					setFavoriteLocations(dedupeDashboardLocations(enriched));
				}
			} else {
				console.error('Failed to fetch favorite locations');
				setFavoriteLocations([]);
			}
		} catch (error) {
			console.error('Error fetching favorite locations:', error);
			setFavoriteLocations([]);
		} finally {
			setLoadingFavorites(false);
		}
	};

	const fetchVisitedLocations = async () => {
		setLoadingVisited(true);
		try {
			const response = await fetch('http://localhost:5173/loc/visited', {
				credentials: 'include'
			});
			if (response.ok) {
				const data: Location[] = await response.json();
				let visitedWithDetails: Location[] = data;
				if (API_KEY) {
					visitedWithDetails = await Promise.all(
						data.map(async (loc) => {
							const details = await fetchTomTomPoiDetailsForLocation(API_KEY, {
								name: loc.name,
								address: loc.address,
								latitude: loc.latitude,
								longitude: loc.longitude
							});
							return { ...loc, ...details };
						})
					);
				}
				setVisitedHistory(visitedWithDetails);
				const unique: Location[] = [];
				const seen = new Set<number>();
				for (const loc of visitedWithDetails) {
					if (!seen.has(loc.lid)) {
						seen.add(loc.lid);
						unique.push(loc);
					}
				}
				setVisitedLocations(unique);
			} else {
				console.error('Failed to fetch visited locations');
				setVisitedLocations([]);
			}
		} catch (error) {
			console.error('Error fetching visited locations:', error);
			setVisitedLocations([]);
		} finally {
			setLoadingVisited(false);
		}
	};

	const handleDeleteFavorite = async (locationId: number) => {
		try {
			const response = await fetch(`http://localhost:5173/loc/${locationId}/unfavorite`, {
				method: 'POST',
				credentials: 'include'
			});
			if (response.ok) {
				setFavoriteLocations(favoriteLocations.filter(loc => loc.lid !== locationId));
				enqueueAlert({ message: "Removed location from favorites.", textColor: "text-red-300" });
			} else {
				console.error('Failed to remove from favorites');
				enqueueAlert({ message: "Failed to remove favorite location.", textColor: "text-red-300" });
			}
		} catch (error) {
			console.error('Error removing from favorites:', error);
			enqueueAlert({ message: "Error removing favorite location.", textColor: "text-red-300" });
		}
	};

	const handleFavoriteVisitedLocation = async (loc: Location) => {
		try {
			const createResponse = await fetch('http://localhost:5173/loc/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: loc.name,
					address: loc.address,
					longitude: loc.longitude,
					latitude: loc.latitude,
					type: 1,
					categories: loc.categories || [],
				}),
			});

			if (!createResponse.ok) {
				enqueueAlert({ message: 'Failed to prepare location for favorites.', textColor: 'text-red-300' });
				return;
			}

			const data = await createResponse.json();
			const locationId = data?.location_id ?? loc.lid;
			const favoriteResponse = await fetch(`http://localhost:5173/loc/${locationId}/favorite`, {
				method: 'POST',
				credentials: 'include',
			});

			if (!favoriteResponse.ok) {
				enqueueAlert({ message: 'Failed to add visited location to favorites.', textColor: 'text-red-300' });
				return;
			}

			enqueueAlert({ message: 'Visited location added to favorites.', textColor: 'text-green-300' });
			await fetchFavoriteLocations();
		} catch (error) {
			console.error('Error adding visited location to favorites:', error);
			enqueueAlert({ message: 'Error adding visited location to favorites.', textColor: 'text-red-300' });
		}
	};

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
					<button className="px-3 py-1 rounded-full bg-cyan-500 text-neutral-950 max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" type="submit">
						Upload New Picture
					</button>
					<button className="px-3 py-1 rounded-full bg-cyan-500 text-neutral-950 max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
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
				   <button className="px-3 py-1 rounded-full bg-cyan-500 text-neutral-950 max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" type="submit">
					   Change Password
				   </button>
				   <button className="px-3 py-1 rounded-full bg-cyan-500 text-neutral-950 max-w-fit text-md transition-all hover:bg-cyan-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
			   </div>
			</form>
		</div>);
	}

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, {
					credentials: 'include'
				});
				if (response.ok) {
					const data = await response.json();
					setUser(data);
					setProfilePic(data.profile_picture);
					try {
						const storageKey = `bizmatch_saved_coupons_${Number(data.uid)}`;
						const raw = window.localStorage.getItem(storageKey);
						const parsed = raw ? JSON.parse(raw) : [];
						setSavedCouponKeys(Array.isArray(parsed) ? dedupeStrings(parsed.filter((v): v is string => typeof v === 'string')) : []);
					} catch {
						setSavedCouponKeys([]);
					}
					try {
						const metaStorageKey = `bizmatch_saved_coupon_meta_${Number(data.uid)}`;
						const rawMeta = window.localStorage.getItem(metaStorageKey);
						const parsedMeta = rawMeta ? JSON.parse(rawMeta) : {};
						setSavedCouponMeta(parsedMeta && typeof parsedMeta === 'object' ? parsedMeta : {});
					} catch {
						setSavedCouponMeta({});
					}
				} else {
					navigate('/login');
				}
			} catch (error) {
				console.error('Error fetching profile:', error);
				navigate('/login');
			}
		};
		fetchProfile();
	}, [navigate]);

	useEffect(() => {
		if (user) {
			fetchFavoriteLocations();
			fetchVisitedLocations();
		}
	}, [user]);

	useEffect(() => {
		if (!user) return;
		try {
			const numericUid = Number(user.uid);
			const onboardingStorageKey = `bizmatch_onboarding_seen_${numericUid}`;
			if (numericUid === 1) {
				const resetMarkerKey = 'bizmatch_onboarding_reset_once_user_1_v1';
				const hasReset = window.localStorage.getItem(resetMarkerKey);
				if (hasReset !== '1') {
					window.localStorage.removeItem(onboardingStorageKey);
					window.localStorage.setItem(resetMarkerKey, '1');
				}
			}
			const seen = window.localStorage.getItem(onboardingStorageKey);
			if (seen !== '1') {
				setOnboardingStepIndex(0);
				setShowOnboarding(true);
			}
		} catch {
			setOnboardingStepIndex(0);
			setShowOnboarding(true);
		}
	}, [user?.uid]);

	useEffect(() => {
		if (!user) return;
		try {
			const storageKey = `bizmatch_saved_coupons_${Number(user.uid)}`;
			window.localStorage.setItem(storageKey, JSON.stringify(savedCouponKeys));
		} catch {
			// ignore storage errors
		}
	}, [savedCouponKeys, user]);

	useEffect(() => {
		if (!user) return;
		try {
			const metaStorageKey = `bizmatch_saved_coupon_meta_${Number(user.uid)}`;
			window.localStorage.setItem(metaStorageKey, JSON.stringify(savedCouponMeta));
		} catch {
			// ignore storage errors
		}
	}, [savedCouponMeta, user]);

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

	const handlePopup = () => {
		setPopup(true);
	}

	const finishOnboarding = () => {
		if (!user) {
			setShowOnboarding(false);
			return;
		}
		try {
			const onboardingStorageKey = `bizmatch_onboarding_seen_${Number(user.uid)}`;
			window.localStorage.setItem(onboardingStorageKey, '1');
		} catch {
			// ignore storage errors
		}
		setShowOnboarding(false);
	};

	const nextOnboardingStep = () => {
		if (onboardingStepIndex >= APP_ONBOARDING_STEPS.length - 1) {
			finishOnboarding();
			return;
		}
		setOnboardingStepIndex((current) => current + 1);
	};

	const formatVisitedAt = (visitedAt?: string) => {
		if (!visitedAt) return 'Unknown time';
		const date = new Date(visitedAt);
		if (Number.isNaN(date.getTime())) return 'Unknown time';
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		}).format(date);
	};
	const buildMapRouteUrl = (loc: Location) => {
		const params = new URLSearchParams({
			lat: String(loc.latitude),
			lon: String(loc.longitude),
			name: loc.name || '',
			address: loc.address || '',
		});
		if (loc.phone) params.set('phone', loc.phone);
		if (loc.email) params.set('email', loc.email);
		if (loc.website) params.set('website', loc.website);
		const serializedHours = serializeBusinessHours(loc.businessHours);
		if (serializedHours) params.set('businessHours', serializedHours);
		const serializedSocials = serializeSocials(loc.socials);
		if (serializedSocials) params.set('socials', serializedSocials);
		return `/map?${params.toString()}`;
	};

	const totalDistanceMiles = useMemo(() => {
		if (visitedHistory.length < 2) return 0;

		const toRad = (deg: number) => (deg * Math.PI) / 180;
		const haversineMiles = (a: Location, b: Location) => {
			const R = 3958.8;
			const dLat = toRad(b.latitude - a.latitude);
			const dLon = toRad(b.longitude - a.longitude);
			const lat1 = toRad(a.latitude);
			const lat2 = toRad(b.latitude);
			const h =
				Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
			return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
		};

		const ordered = [...visitedHistory].sort((a, b) => {
			const ta = a.visited_at ? new Date(a.visited_at).getTime() : 0;
			const tb = b.visited_at ? new Date(b.visited_at).getTime() : 0;
			return ta - tb;
		});

		let total = 0;
		for (let i = 1; i < ordered.length; i++) {
			total += haversineMiles(ordered[i - 1], ordered[i]);
		}
		return total;
	}, [visitedHistory]);

	const couponPreviews = useMemo(() => {
		const allLocations = dedupeDashboardLocations([...favoriteLocations, ...visitedLocations]);
		const uniqueByLid = allLocations.filter((loc, i, arr) => arr.findIndex((x) => x.lid === loc.lid) === i);
		const byLid = new Map<number, Location>(uniqueByLid.map((loc) => [loc.lid, loc]));

		const parsedSaved = savedCouponKeys
			.map((key) => {
				const [source, lidPart, code] = key.split('|');
				const lid = Number(lidPart);
				const meta = savedCouponMeta[key];
				const locFromList = Number.isFinite(lid) ? byLid.get(lid) : undefined;
				const loc: Location | null = locFromList || (meta
					? {
						lid: meta.lid,
						name: meta.name,
						address: meta.address,
						longitude: 0,
						latitude: 0,
						type: 1,
					}
					: null);
				if (!loc) return null;
				return { loc, code, source, key, meta };
			})
			.filter(Boolean) as Array<{ loc: Location; code: string; source: string; key: string; meta?: SavedCouponMeta }>;

		return parsedSaved.slice(0, 8).map((entry, idx) => {
				const category = (entry.loc.categories?.[0] || '').toLowerCase();
				const isFood = /(restaurant|food|cafe|coffee|pizza|bar|nightlife)/.test(category);
				const isShop = /(shopping|store|retail|mall)/.test(category);
				const parsedDiscount = entry.code.match(/(\d+)OFF/i)?.[1];
				return {
					loc: entry.loc,
					label: entry.meta?.discountLabel || (parsedDiscount ? `${parsedDiscount}% OFF` : 'Coupon'),
					title: entry.meta?.title || (isFood ? 'Meal Coupon' : isShop ? 'Shopping Coupon' : 'Local Coupon'),
					code: entry.code,
					key: entry.key,
					index: idx,
				};
			});
	}, [visitedLocations, favoriteLocations, savedCouponKeys, savedCouponMeta]);

	const unsaveCouponByKey = (couponKey: string) => {
		setSavedCouponKeys((prev) => prev.filter((key) => key !== couponKey));
		setSavedCouponMeta((curr) => {
			const next = { ...curr };
			delete next[couponKey];
			return next;
		});
		enqueueAlert({ message: 'Coupon unsaved.', textColor: 'text-red-300' });
	};

	const getCouponKey = (source: string, lid: number, code: string) => `${source}|${lid}|${code}`;

	const toggleSaveAiCoupon = (coupon: AiCouponSuggestion) => {
		const key = getCouponKey('nearby', coupon.location.lid, coupon.code);
		const isSaved = savedCouponKeys.includes(key);
		if (isSaved) {
			unsaveCouponByKey(key);
			return;
		}

		setSavedCouponKeys((prev) => dedupeStrings([...prev, key]));
		setSavedCouponMeta((curr) => ({
			...curr,
			[key]: {
				key,
				name: coupon.location.name,
				title: coupon.title,
				discountLabel: coupon.discountLabel,
				code: coupon.code,
				lid: coupon.location.lid,
				sourceType: 'nearby',
				address: coupon.location.address,
			},
		}));
		enqueueAlert({ message: 'Coupon saved.', textColor: 'text-green-300' });
	};

	const openAiLocationReviews = async (loc: Location) => {
		setAiReviewModalLocation(loc);
		setAiReviewModalReviews([]);
		setAiReviewModalLoading(true);
		setAiReviewModalResolvedLid(null);
		try {
			let resolvedLid = loc.lid > 0 ? loc.lid : null;
			if (!resolvedLid) {
				resolvedLid = await resolveLocationId({
					lid: loc.lid,
					name: loc.name,
					address: loc.address,
					latitude: loc.latitude,
					longitude: loc.longitude,
					type: 1,
					categories: loc.categories || [],
				});
			}

			setAiReviewModalResolvedLid(resolvedLid);
			if (!resolvedLid) {
				setAiReviewModalReviews([]);
				return;
			}

			const response = await fetch(`http://localhost:5173/rate/loc/${resolvedLid}/reviews`, {
				credentials: 'include',
			});
			if (!response.ok) {
				setAiReviewModalReviews([]);
				return;
			}
			const data = await response.json();
			const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
			const cleaned: BackendReview[] = reviews
				.filter((review: any) =>
					review &&
					Number.isFinite(Number(review.user_id)) &&
					typeof review.username === 'string' &&
					Number.isFinite(Number(review.star_rating)) &&
					typeof review.content === 'string'
				)
				.map((review: any) => ({
					user_id: Number(review.user_id),
					username: review.username.trim() || 'Unknown user',
					star_rating: Math.max(1, Math.min(5, Math.round(Number(review.star_rating) || 1))),
					content: review.content.trim(),
				}))
				.filter((review: BackendReview) => review.content.length > 0);
			setAiReviewModalReviews(cleaned);
		} catch (error) {
			console.error('Error loading AI location reviews:', error);
			setAiReviewModalReviews([]);
		} finally {
			setAiReviewModalLoading(false);
		}
	};

	const aiSuggestedLocations = useMemo(() => {
		const all = dedupeDashboardLocations([...visitedHistory, ...visitedLocations, ...favoriteLocations]);
		const favoriteIds = new Set(favoriteLocations.map((loc) => loc.lid));
		const visitCounts = visitedHistory.reduce<Record<number, number>>((acc, loc) => {
			acc[loc.lid] = (acc[loc.lid] || 0) + 1;
			return acc;
		}, {});

		const scored: AiLocationSuggestion[] = all.map((loc) => {
			const category = (loc.categories?.[0] || '').toLowerCase();
			const categoryBoost =
				/(restaurant|food|cafe|coffee|pizza)/.test(category) ? 0.9 :
				/(shopping|store|retail|mall)/.test(category) ? 0.7 :
				/(park|fitness|sports|outdoor|activity)/.test(category) ? 0.6 : 0.4;
			const favoriteBoost = favoriteIds.has(loc.lid) ? 1.1 : 0.5;
			const visitBoost = Math.min(visitCounts[loc.lid] || 0, 4) * 0.35;
			const score = Number((categoryBoost + favoriteBoost + visitBoost).toFixed(2));
			const reason = favoriteIds.has(loc.lid)
				? 'Matches your favorites and recent activity.'
				: 'Aligned with your recent visits and category preferences.';
			return { loc, score, reason };
		});

		return scored
			.sort((a, b) => b.score - a.score)
			.slice(0, 8);
	}, [favoriteLocations, visitedLocations, visitedHistory]);

	const aiSuggestedCoupons = useMemo<AiCouponSuggestion[]>(() => {
		return aiSuggestedLocations.map((entry) => {
			const category = (entry.loc.categories?.[0] || '').toLowerCase();
			const isFood = /(restaurant|food|cafe|coffee|pizza|bar)/.test(category);
			const isShop = /(shopping|store|retail|mall)/.test(category);
			const baseDiscount = isFood ? 18 : isShop ? 14 : 12;
			const adaptiveBonus = Math.min(10, Math.max(0, Math.round((entry.score - 1.4) * 5)));
			const discount = Math.max(10, Math.min(30, baseDiscount + adaptiveBonus));
			const prefix = entry.loc.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'LOCAL';
			return {
				location: entry.loc,
				title: isFood ? 'AI Meal Deal' : isShop ? 'AI Shopping Deal' : 'AI Local Deal',
				discountLabel: `${discount}% OFF`,
				code: `${prefix}${discount}AI`,
				reason: entry.reason,
			};
		});
		}, [aiSuggestedLocations]);

	const circularAiSuggestedLocations = useMemo(() => {
		if (aiSuggestedLocations.length <= 1) return aiSuggestedLocations;
		const last = aiSuggestedLocations[aiSuggestedLocations.length - 1];
		const first = aiSuggestedLocations[0];
		return [last, ...aiSuggestedLocations, first];
	}, [aiSuggestedLocations]);

	const circularAiSuggestedCoupons = useMemo(() => {
		if (aiSuggestedCoupons.length <= 1) return aiSuggestedCoupons;
		const last = aiSuggestedCoupons[aiSuggestedCoupons.length - 1];
		const first = aiSuggestedCoupons[0];
		return [last, ...aiSuggestedCoupons, first];
	}, [aiSuggestedCoupons]);

	const aiLocationSnapScrollRef = useRef(false);
	const aiCouponSnapScrollRef = useRef(false);

	const nextAiLocationSlide = () => {
		setAiLocationSlide((curr) => {
			if (aiSuggestedLocations.length <= 1) return 0;
			return Math.min(aiSuggestedLocations.length + 1, curr + 1);
		});
	};

	const prevAiLocationSlide = () => {
		setAiLocationSlide((curr) => {
			if (aiSuggestedLocations.length <= 1) return 0;
			return Math.max(0, curr - 1);
		});
	};

	const nextAiCouponSlide = () => {
		setAiCouponSlide((curr) => {
			if (aiSuggestedCoupons.length <= 1) return 0;
			return Math.min(aiSuggestedCoupons.length + 1, curr + 1);
		});
	};

	const prevAiCouponSlide = () => {
		setAiCouponSlide((curr) => {
			if (aiSuggestedCoupons.length <= 1) return 0;
			return Math.max(0, curr - 1);
		});
	};

	const scrollCarouselToIndex = (
		container: HTMLDivElement | null,
		index: number,
		behavior: ScrollBehavior = 'smooth'
	) => {
		if (!container) return;
		const firstCard = container.firstElementChild as HTMLElement | null;
		if (!firstCard) return;
		const style = window.getComputedStyle(container);
		const gap = Number.parseFloat(style.gap || style.columnGap || '0') || 0;
		const baseLeft = index * (firstCard.offsetWidth + gap);
		const centerOffset = Math.max(0, (container.clientWidth - firstCard.offsetWidth) / 2);
		const targetLeft = Math.max(0, baseLeft - centerOffset);
		container.scrollTo({ left: targetLeft, behavior });
	};

	useEffect(() => {
		aiLocationSnapScrollRef.current = true;
		setAiLocationSlide(aiSuggestedLocations.length > 1 ? 1 : 0);
	}, [aiSuggestedLocations.length]);

	useEffect(() => {
		aiCouponSnapScrollRef.current = true;
		setAiCouponSlide(aiSuggestedCoupons.length > 1 ? 1 : 0);
	}, [aiSuggestedCoupons.length]);

	useEffect(() => {
		scrollCarouselToIndex(
			aiLocationCarouselRef.current,
			aiLocationSlide,
			aiLocationSnapScrollRef.current ? 'auto' : 'smooth'
		);
		aiLocationSnapScrollRef.current = false;
	}, [aiLocationSlide]);

	useEffect(() => {
		scrollCarouselToIndex(
			aiCouponCarouselRef.current,
			aiCouponSlide,
			aiCouponSnapScrollRef.current ? 'auto' : 'smooth'
		);
		aiCouponSnapScrollRef.current = false;
	}, [aiCouponSlide]);

	useEffect(() => {
		if (aiSuggestedLocations.length <= 1) return;
		if (aiLocationSlide !== 0 && aiLocationSlide !== aiSuggestedLocations.length + 1) return;
		const timeout = window.setTimeout(() => {
			aiLocationSnapScrollRef.current = true;
			setAiLocationSlide(aiLocationSlide === 0 ? aiSuggestedLocations.length : 1);
		}, 420);
		return () => window.clearTimeout(timeout);
	}, [aiLocationSlide, aiSuggestedLocations.length]);

	useEffect(() => {
		if (aiSuggestedCoupons.length <= 1) return;
		if (aiCouponSlide !== 0 && aiCouponSlide !== aiSuggestedCoupons.length + 1) return;
		const timeout = window.setTimeout(() => {
			aiCouponSnapScrollRef.current = true;
			setAiCouponSlide(aiCouponSlide === 0 ? aiSuggestedCoupons.length : 1);
		}, 420);
		return () => window.clearTimeout(timeout);
	}, [aiCouponSlide, aiSuggestedCoupons.length]);

	useEffect(() => {
		if (aiSuggestedLocations.length < 2) return;
		const interval = window.setInterval(() => {
			nextAiLocationSlide();
		}, 5000);
		return () => window.clearInterval(interval);
	}, [aiSuggestedLocations.length]);

	useEffect(() => {
		if (aiSuggestedCoupons.length < 2) return;
		const interval = window.setInterval(() => {
			nextAiCouponSlide();
		}, 5600);
		return () => window.clearInterval(interval);
	}, [aiSuggestedCoupons.length]);

	useEffect(() => {
		const onScroll = () => {
			setShowScrollTopButton(window.scrollY > 260);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
		ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	if (!user) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;

	return (
		<Body>
			<Navbar page="Dashboard">
				<Links link="map">
					Map <MapPin size={22} />
				</Links>
				<Links link="tinder">
					Findr <Heart size={22} />
				</Links>
				<Links link="discount">
					Coupons <TicketPercent size={18} />
				</Links>
				<Links link="reviews">
					Reviews <Star size={18} />
				</Links>
			</Navbar>
			<div className="relative grid gap-11 pt-28">
				<div className="text-cyan-500/80" >
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
									<img  className="rounded-full border-4 w-40 h-40 object-cover shadow-w-auto border-cyan-600 mb-4 align-center" src={imageSrc} alt="Profile" />
									{!openForm&&(<div className="items-center align-items-center justify-center">
										<button className="mt-4 px-4 py-2 bg-cyan-500 text-neutral-950 rounded-lg hover:bg-cyan-400 transition-colors inline-block mr-3" onClick={() => {setOpenForm(true); setPfpChange(false);}}>Change Password</button>
										<button className="mt-4 px-4 py-2 bg-cyan-500 text-neutral-950 rounded-lg hover:bg-cyan-400 transition-colors inline-block" onClick={() => {setOpenForm(true); setPfpChange(true);}}>Change Profile Picture</button>
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
						{showOnboarding && (
							<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1900] px-4">
								<Card
									title={(
										<div className="grid grid-cols-[1fr_auto] items-start gap-3">
											<div>
												<h1 className="text-2xl font-bold text-cyan-500 line-clamp-2">Welcome Tour</h1>
												<p className="mt-1 text-sm text-cyan-200 line-clamp-1">Step {onboardingStepIndex + 1} of {APP_ONBOARDING_STEPS.length}</p>
											</div>
											<button
												className="px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors"
												onClick={finishOnboarding}
											>
												Skip
											</button>
										</div>
									)}
									cardClassName="w-full max-w-3xl"
								>
									<div className="space-y-4">
										<div className="rounded-xl border border-white/10 bg-neutral-800/60 p-4">
											<h3 className="text-lg font-semibold text-cyan-200">{onboardingStep.title}</h3>
											<p className="mt-2 text-sm text-gray-200">{onboardingStep.description}</p>
											<p className="mt-1 text-sm text-gray-300">{onboardingStep.buttonNotes}</p>
											<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/85">Key Actions</p>
											<ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-300">
												{onboardingStep.quickActions.map((action, idx) => (
													<li key={`onboarding-action-${onboardingStep.title}-${idx}`}>{action}</li>
												))}
											</ul>
											<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/85">Navigation Tips</p>
											<ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-300">
												{onboardingStep.navigationTips.map((tip, idx) => (
													<li key={`onboarding-tip-${onboardingStep.title}-${idx}`}>{tip}</li>
												))}
											</ul>
											<div className="mt-3 flex h-[180px] w-full items-center justify-center rounded-xl border border-dashed border-cyan-400/45 bg-neutral-900/65">
												<p className="px-4 text-center text-xs text-gray-400">
													Image placeholder: use `360px x 180px` artwork to fit this frame.
												</p>
											</div>
										</div>
										<div className="flex items-center justify-center gap-2">
											{APP_ONBOARDING_STEPS.map((_, idx) => (
												<span
													key={`onboarding-dot-${idx}`}
													className={`h-2.5 w-2.5 rounded-full ${idx === onboardingStepIndex ? 'bg-cyan-300' : 'bg-white/25'}`}
												/>
											))}
										</div>
										<div className="flex justify-end">
											<button
												onClick={nextOnboardingStep}
												className="rounded-md border border-cyan-300/45 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30"
											>
												{onboardingStepIndex >= APP_ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
											</button>
										</div>
									</div>
								</Card>
							</div>
						)}
						<div className="relative mx-auto w-[95%]">
							<div className="absolute right-2 top-0 z-20 flex items-center gap-2">
								<button
									onClick={handleLogout}
									className="rounded-full border border-cyan-300/45 bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-cyan-400 transition-colors"
								>
									Logout →
								</button>
							</div>
							<div className="grid grid-cols-1 gap-y-3 place-items-center text-center pt-1">
							<img onClick={handlePopup} className="rounded-full border-4 w-32 h-32 object-cover shadow-w-auto border-cyan-600 hover:border-cyan-700 transition-transform" src={imageSrc} alt="Profile" />
							<p className="text-black-400 text-3xl tracking-wider">Welcome back {user.username}</p>
							</div>
						</div>
				</div> 
				<div className="mx-auto w-[95%] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					<div className="rounded-lg border border-cyan-400/25 bg-neutral-900/75 px-3 py-2 text-center">
						<p className="text-[10px] uppercase tracking-[0.08em] text-cyan-200/75">Locations Favorited</p>
						<p className="text-lg font-semibold text-cyan-300">{favoriteLocations.length}</p>
					</div>
					<div className="rounded-lg border border-cyan-400/25 bg-neutral-900/75 px-3 py-2 text-center">
						<p className="text-[10px] uppercase tracking-[0.08em] text-cyan-200/75">Locations Visited</p>
						<p className="text-lg font-semibold text-cyan-300">{visitedLocations.length}</p>
					</div>
					<div className="rounded-lg border border-cyan-400/25 bg-neutral-900/75 px-3 py-2 text-center">
						<p className="text-[10px] uppercase tracking-[0.08em] text-cyan-200/75">Saved Coupons</p>
						<p className="text-lg font-semibold text-cyan-300">{savedCouponKeys.length}</p>
					</div>
					<div className="rounded-lg border border-cyan-400/25 bg-neutral-900/75 px-3 py-2 text-center">
						<p className="text-[10px] uppercase tracking-[0.08em] text-cyan-200/75">Distance Travelled</p>
						<p className="text-lg font-semibold text-cyan-300">{totalDistanceMiles.toFixed(1)} mi</p>
					</div>
				</div>
					<div className="mx-auto w-[95%] flex flex-wrap items-center justify-center gap-2">
						<button
							onClick={() => scrollToSection(favoriteSectionRef)}
							className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
						>
							Favorite Locations
						</button>
						<button
							onClick={() => scrollToSection(savedCouponsSectionRef)}
							className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
						>
							Saved Coupons
						</button>
						<button
							onClick={() => scrollToSection(recentSectionRef)}
							className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
						>
							Recently Visited
						</button>
						<button
							onClick={() => scrollToSection(aiSectionRef)}
							className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
						>
							AI Suggestions
						</button>
					</div>
					<div className="w-[95%] h-[2px] mx-auto bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.25)]" />

					<div className="mx-auto w-[96%] max-w-7xl space-y-5">
					<div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
						<div ref={favoriteSectionRef} className="h-full">
						<Card
							title={(
								<div className="flex items-center justify-between gap-3 text-3xl font-bold text-cyan-500 line-clamp-2">
									<span>Favorite Locations:</span>
									<button
										onClick={() => setShowFavoritesSidebar((prev) => !prev)}
										className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
									>
										{showFavoritesSidebar ? 'Hide Sidebar' : 'View All Favorites'}
									</button>
								</div>
							)}
							cardClassName='w-full h-[640px] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
						>
							<div className="flex h-[500px] flex-col gap-3 overflow-y-auto pr-1">
								{loadingFavorites ? (
									<p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
								) : favoriteLocations.length === 0 ? (
									<p className="text-gray-400 text-center py-4">No favorite locations yet. Visit the map to add some!</p>
									) : favoriteLocations.map((loc, i) => (
										<div key={`favorite-${loc.lid}-${i}`} className="min-h-[172px] rounded-xl border border-white/10 bg-neutral-800/55 p-3.5 hover:bg-neutral-800/80 transition-colors">
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0 cursor-pointer" onClick={() => navigate(buildMapRouteUrl(loc))}>
													<h3 className="text-base font-semibold text-cyan-300 line-clamp-1">{loc.name}</h3>
													<p className="text-xs text-gray-400 line-clamp-1">{loc.address}</p>
													<p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
														{loc.categories && loc.categories.length > 0
															? `Categories: ${loc.categories.join(', ')}`
															: 'Categories: N/A'}
													</p>
													<CompactLocationMeta loc={loc} />
												</div>
											<button
												onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(loc.lid); }}
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-400/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
												aria-label="Remove favorite"
											>
												<HeartMinus size={16} className="text-red-400" />
											</button>
										</div>
									</div>
								))}
							</div>
						</Card>
						</div>

						<div ref={savedCouponsSectionRef} className="h-full">
						<Card
							title={(
								<div className="flex items-center justify-between gap-3 text-3xl font-bold text-cyan-500 line-clamp-2">
									<span>Saved Coupons:</span>
									<button
										onClick={() => navigate('/discount', { state: { from: 'dashboard' } })}
										className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
									>
										Go to Coupons
									</button>
								</div>
							)}
							cardClassName='w-full h-[640px] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
						>
							<div className="flex h-[500px] flex-col gap-3 overflow-y-auto pr-1">
								{couponPreviews.length === 0 ? (
									<p className="text-gray-400 text-center py-4">No saved coupons yet. Save them from the Coupons page.</p>
								) : couponPreviews.map((coupon) => (
									<div
										key={`coupon-preview-${coupon.index}-${coupon.loc.lid}`}
										className="min-h-[108px] rounded-xl border border-white/10 bg-neutral-800/55 p-3.5 hover:bg-neutral-800/80 transition-colors"
									>
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0">
													<p className="text-cyan-200 font-semibold line-clamp-1">{coupon.loc.name}</p>
													<p className="text-xs text-gray-300 line-clamp-1">{coupon.title} • {coupon.label}</p>
													<p className="text-xs text-gray-400">Code: {coupon.code}</p>
													<p className="text-[11px] text-gray-500 mt-1 line-clamp-1">Address: {coupon.loc.address || 'N/A'}</p>
												</div>
											<button
												onClick={() => unsaveCouponByKey(coupon.key)}
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/22 transition-colors"
												aria-label="Unsave coupon"
												title="Unsave coupon"
											>
												<BookmarkCheck size={16} className="text-cyan-200" />
											</button>
										</div>
									</div>
								))}
							</div>
						</Card>
						</div>
					</div>

					<div ref={recentSectionRef} className="w-full">
						<Card title='Recently Visited:' cardClassName='w-full h-[640px] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
							<div className="flex h-[500px] flex-col gap-3 overflow-y-auto pr-1">
								{loadingVisited ? (
									<p className="text-gray-400 text-center py-4">Loading visited locations...</p>
								) : visitedLocations.length === 0 ? (
									<p className="text-gray-400 text-center py-4">No visited locations yet. Navigate somewhere on the map!</p>
								) : (
									visitedLocations.map((loc, i) => (
										<div key={`visited-${loc.lid}-${i}`} className="min-h-[188px] rounded-xl border border-white/10 bg-neutral-800/55 p-3.5 hover:bg-neutral-800/80 transition-colors">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0 cursor-pointer" onClick={() => navigate(buildMapRouteUrl(loc))}>
													<h3 className="text-base font-semibold text-cyan-300 line-clamp-1">{loc.name}</h3>
													<p className="text-xs text-gray-400 line-clamp-1">{loc.address}</p>
													<p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
														{loc.categories && loc.categories.length > 0
															? `Categories: ${loc.categories.join(', ')}`
															: 'Categories: N/A'}
													</p>
													<p className="text-[11px] text-cyan-200/70 mt-1">Visited: {formatVisitedAt(loc.visited_at)}</p>
													<CompactLocationMeta loc={loc} />
												</div>
												<div className="flex shrink-0 items-center gap-2">
													<button
														onClick={() => navigate(`/reviews?locationId=${encodeURIComponent(String(loc.lid))}`)}
														className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/25 transition-colors"
													>
														Review
													</button>
													<button
														onClick={() => navigate('/discount', { state: { from: 'dashboard', locationId: loc.lid } })}
														className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/25 transition-colors"
													>
														Coupon
													</button>
													<button
														onClick={() => handleFavoriteVisitedLocation(loc)}
														className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
														aria-label="Favorite visited location"
													>
														<HeartPlus size={16} className="text-emerald-300" />
													</button>
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</Card>
					</div>

					<div ref={aiSectionRef} className="w-full grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
						<Card
							title="AI Suggested Locations"
							cardClassName='w-full h-[500px] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
						>
							{aiSuggestedLocations.length === 0 ? (
								<div className="flex h-[320px] items-center justify-center">
									<p className="text-gray-400 text-center py-8">Not enough location history yet for AI suggestions.</p>
								</div>
							) : (
									<div className="relative flex h-[320px] items-center justify-center">
										<button
											onClick={prevAiLocationSlide}
											className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-neutral-900/90 p-2 text-cyan-200 hover:bg-neutral-800"
											aria-label="Previous AI location"
										>
											<ChevronLeft size={16} />
										</button>
												<div ref={aiLocationCarouselRef} className="flex h-full w-full items-center gap-4 overflow-x-hidden px-10 scroll-smooth">
													{circularAiSuggestedLocations.map((item, idx) => (
													<div
														key={`ai-location-${item.loc.lid}-${idx}`}
														className="relative min-w-[calc(100%-5.5rem)] max-w-[calc(100%-5.5rem)] h-[286px] shrink-0 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 pt-10 flex flex-col justify-between"
													>
													<button
														onClick={() => handleFavoriteVisitedLocation(item.loc)}
														className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-rose-400/45 bg-rose-500/15 text-rose-200 hover:bg-rose-500/30"
														aria-label="Like location"
														title="Like location"
													>
														<HeartPlus size={14} />
													</button>
														<p className="text-[11px] uppercase tracking-wide text-cyan-200/80">AI match score {item.score.toFixed(2)}</p>
															<h4 className="mt-1 text-lg font-semibold text-cyan-100 line-clamp-1">{item.loc.name}</h4>
															<p className="mt-1 text-xs text-gray-300 line-clamp-2">{item.loc.address || 'Address unavailable'}</p>
															<p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
																{item.loc.categories && item.loc.categories.length > 0
																	? `Categories: ${item.loc.categories.join(', ')}`
																	: 'Categories: N/A'}
															</p>
															<p className="mt-2 text-xs text-gray-400 line-clamp-2">{item.reason}</p>
															<CompactLocationMeta loc={item.loc} />
															<div className="mt-3 flex flex-wrap items-center gap-2">
														<button
															onClick={() => navigate(buildMapRouteUrl(item.loc))}
															className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/30"
														>
															Open Location
														</button>
															<button
																onClick={() => void openAiLocationReviews(item.loc)}
																className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-gray-100 hover:bg-white/20"
															>
																Reviews
															</button>
														</div>
													</div>
												))}
											</div>
										<button
											onClick={nextAiLocationSlide}
											className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-neutral-900/90 p-2 text-cyan-200 hover:bg-neutral-800"
											aria-label="Next AI location"
										>
										<ChevronRight size={16} />
									</button>
								</div>
							)}
						</Card>

						<Card
							title="AI Suggested Coupons"
							cardClassName='w-full h-[500px] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
						>
							{aiSuggestedCoupons.length === 0 ? (
								<div className="flex h-[320px] items-center justify-center">
									<p className="text-gray-400 text-center py-8">Not enough data yet for AI coupon suggestions.</p>
								</div>
							) : (
									<div className="relative flex h-[320px] items-center justify-center">
										<button
											onClick={prevAiCouponSlide}
											className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-neutral-900/90 p-2 text-cyan-200 hover:bg-neutral-800"
											aria-label="Previous AI coupon"
										>
										<ChevronLeft size={16} />
									</button>
										<div ref={aiCouponCarouselRef} className="flex h-full w-full items-center gap-4 overflow-x-hidden px-10 scroll-smooth">
												{circularAiSuggestedCoupons.map((coupon, idx) => (
														<div
															key={`ai-coupon-${coupon.location.lid}-${idx}`}
															className="relative min-w-[calc(100%-5.5rem)] max-w-[calc(100%-5.5rem)] h-[286px] shrink-0 rounded-xl border border-emerald-400/35 bg-emerald-500/12 p-4 flex flex-col justify-between"
														>
													<div className="flex items-center justify-between gap-2">
														<p className="text-base font-semibold text-emerald-100 line-clamp-1">{coupon.title}</p>
														<div className="flex items-center gap-2">
															<span className="rounded-full border border-emerald-300/35 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
																{coupon.discountLabel}
															</span>
															<button
																onClick={() => toggleSaveAiCoupon(coupon)}
																className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/30"
																aria-label="Save coupon"
																title={savedCouponKeys.includes(getCouponKey('nearby', coupon.location.lid, coupon.code)) ? 'Saved' : 'Save'}
															>
																{savedCouponKeys.includes(getCouponKey('nearby', coupon.location.lid, coupon.code)) ? (
																	<BookmarkCheck size={13} />
																) : (
																	<Bookmark size={13} />
																)}
															</button>
														</div>
													</div>
												<p className="mt-1 text-sm text-emerald-50 line-clamp-1">{coupon.location.name}</p>
												<p className="mt-1 text-xs text-gray-300">Code: <span className="font-semibold text-emerald-100">{coupon.code}</span></p>
													<p className="mt-2 text-xs text-gray-400 line-clamp-2">{coupon.reason}</p>
													<div className="mt-3 flex flex-wrap items-center gap-2">
															<button
																onClick={() => navigate('/discount', { state: { from: 'dashboard', locationId: coupon.location.lid } })}
																className="rounded-md border border-emerald-300/40 bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/30"
															>
																View Coupon
															</button>
															<button
																onClick={() => navigate(buildMapRouteUrl(coupon.location))}
																className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-gray-100 hover:bg-white/20"
															>
																Open in Map
														</button>
													</div>
												</div>
											))}
										</div>
										<button
											onClick={nextAiCouponSlide}
											className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-neutral-900/90 p-2 text-cyan-200 hover:bg-neutral-800"
											aria-label="Next AI coupon"
										>
										<ChevronRight size={16} />
									</button>
								</div>
							)}
						</Card>
					</div>
					</div>
						{aiReviewModalLocation && (
							<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1700] px-4">
								<Card
									title={(
										<div className="grid grid-cols-[1fr_auto] items-start gap-3">
											<div>
												<h1 className="text-2xl font-bold text-cyan-500 line-clamp-2">Location Reviews</h1>
												<p className="mt-1 text-sm text-cyan-200 line-clamp-1">{aiReviewModalLocation.name}</p>
												<p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{aiReviewModalLocation.address || 'Address unavailable'}</p>
											</div>
											<button
												className="px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors"
												onClick={() => {
													setAiReviewModalLocation(null);
													setAiReviewModalResolvedLid(null);
												}}
											>
												X
											</button>
										</div>
									)}
									cardClassName='w-full max-w-2xl'
								>
									<div className="max-h-[62vh] overflow-y-auto space-y-4 pr-1">
										<div>
											<h3 className="mb-2 text-sm font-semibold text-cyan-300">Google Reviews</h3>
											{aiReviewModalGoogleReviews.length === 0 ? (
												<p className="text-sm text-gray-300">No Google reviews for this location yet.</p>
											) : (
												<div className="space-y-3">
													{aiReviewModalGoogleReviews.map((review, idx) => (
														<div key={`google-${review.name}-${idx}`} className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
															<div className="flex items-center justify-between gap-2">
																<p className="text-sm font-semibold text-cyan-200">{review.name}</p>
																<p className="text-xs text-gray-400">{review.relative_time}</p>
															</div>
															<p className="mt-1 text-xs text-amber-300">{reviewStars(review.star_rating)}</p>
															<p className="mt-2 text-sm text-gray-200">{review.content}</p>
														</div>
													))}
												</div>
											)}
										</div>

										<div>
											<h3 className="mb-2 text-sm font-semibold text-cyan-300">Community Reviews</h3>
											{aiReviewModalLoading ? (
												<p className="text-sm text-gray-300">Loading location reviews...</p>
											) : !aiReviewModalResolvedLid ? (
												<p className="text-sm text-gray-300">This location is not yet stored in the database.</p>
											) : aiReviewModalReviews.length === 0 ? (
												<p className="text-sm text-gray-300">No reviews for this location yet.</p>
											) : (
												<div className="space-y-3">
													{aiReviewModalReviews.map((review, idx) => (
														<div key={`${review.user_id}-${idx}-${review.content}`} className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
															<div className="flex items-center justify-between gap-2">
																<p className="text-sm font-semibold text-cyan-200">{review.username}</p>
																<p className="text-xs text-gray-400">User #{review.user_id}</p>
															</div>
															<p className="mt-1 text-xs text-amber-300">{reviewStars(review.star_rating)}</p>
															<p className="mt-2 text-sm text-gray-200">{review.content}</p>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								</Card>
							</div>
						)}
						{showFavoritesSidebar && (
						<div className="fixed top-20 bottom-3 right-2 z-[1500] w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl">
						<div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
							<h3 className="text-cyan-300 text-lg font-semibold">All Favorited Locations</h3>
						<button
							onClick={() => setShowFavoritesSidebar(false)}
							className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
						>
							✕
						</button>
					</div>
					<div className="h-[calc(100%-48px)] overflow-y-auto pr-1">
						{loadingFavorites ? (
							<p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
						) : favoriteLocations.length === 0 ? (
							<p className="text-gray-400 text-center py-4">No favorite locations yet.</p>
						) : (
							favoriteLocations.map((loc, i) => (
								<div
									key={i}
									className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 hover:bg-neutral-800/80 transition-colors"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="cursor-pointer flex-1 min-w-0 pr-2" onClick={() => { navigate(buildMapRouteUrl(loc)); setShowFavoritesSidebar(false); }}>
											<h4 className="text-cyan-300 text-lg font-semibold">{loc.name}</h4>
											<p className="text-gray-400 text-sm">{loc.address}</p>
											<LocationDetailBlock loc={loc} />
										</div>
										<button
											onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(loc.lid); }}
											className="flex h-[36px] w-[36px] shrink-0 self-center items-center justify-center rounded-md border border-red-400/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
											aria-label="Remove favorite"
										>
											<HeartMinus size={16} className="text-red-400" />
										</button>
									</div>
								</div>
							))
						)}
					</div>
					</div>
				)}
				</div>
				{showScrollTopButton && (
					<button
						onClick={scrollToTop}
						className="fixed bottom-6 right-6 z-[1400] flex items-center gap-2 rounded-full border border-cyan-400/45 bg-neutral-900/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-neutral-800 transition-colors"
						aria-label="Scroll to top"
					>
						<ArrowUp size={14} />
						Top
					</button>
				)}
					<LocalAiChatPopup
					userName={user.username}
				activePage="dashboard"
				favoriteLocations={favoriteLocations}
				visitedLocations={visitedLocations}
			/>
		</Body>
	)
};

export default Dashboard;
