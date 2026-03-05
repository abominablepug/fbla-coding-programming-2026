import React, { useEffect, useMemo, useState } from 'react';
import Card from "../components/card";
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import { BookmarkCheck, Heart, HeartMinus, HeartPlus, MapPin, Star, TicketPercent } from 'lucide-react';
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
			<div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
				Socials: {loc.socials && loc.socials.length > 0 ? loc.socials.slice(0, 3).map((social) => social.platform).join(', ') : 'N/A'}
			</div>
			<div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
				Hours: {formattedHours.length > 0 ? formattedHours.join(' | ') : 'N/A'}
			</div>
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
	const [showCouponsSidebar, setShowCouponsSidebar] = useState(false);
	const [savedCouponKeys, setSavedCouponKeys] = useState<string[]>([]);
	const [savedCouponMeta, setSavedCouponMeta] = useState<Record<string, SavedCouponMeta>>({});
	
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
				<input className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" type="file" accept='image/png' id="image" name="image"/>
				<div className="flex justify-center gap-2">
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" type="submit">
						Upload New Picture
					</button>
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
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
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
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
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
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
						className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
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
				   <button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" type="submit">
					   Change Password
				   </button>
				   <button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
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
				<Links link="/" onClick={handleLogout}>
					Logout →
				</Links>
			</Navbar>
			<div className="relative grid gap-11 pt-28">
				<div className="text-cyan-500/80" >
						{popup && (
							<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overscroll">
								<Card title={(
									<div className="grid grid-cols-2">
									<h1 className={`text-2xl font-bold text-[#406386] line-clamp-2`}>
										Account Details
									</h1>
									<button className="ml-42 px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors" onClick={() => {setPopup(false); setOpenForm(false);}}>X</button>
									</div>
								)} cardClassName='w-lg'>
								<div className="max-w-md w-full align-items-center justify-items-center">
									<img  className="rounded-full border-4 w-40 h-40 object-cover shadow-w-auto border-cyan-600 mb-4 align-center" src={imageSrc} alt="Profile" />
									{!openForm&&(<div className="items-center align-items-center justify-center">
										<button className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors inline-block mr-3" onClick={() => {setOpenForm(true); setPfpChange(false);}}>Change Password</button>
										<button className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors inline-block" onClick={() => {setOpenForm(true); setPfpChange(true);}}>Change Profile Picture</button>
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
						<div className="grid grid-cols-1 gap-y-3 place-items-center text-center">
							<img onClick={handlePopup} className="rounded-full border-4 w-32 h-32 object-cover shadow-w-auto border-cyan-600 hover:border-cyan-700 transition-transform" src={imageSrc} alt="Profile" />
							<p className="text-black-400 text-3xl tracking-wider">Welcome back {user.username}</p>
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
				<div className="w-[95%] h-[2px] mx-auto bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.25)]" />
				<div className="grid grid-cols-2" >
				<Card
					title={
						<div className="flex items-center justify-between gap-3 text-3xl font-bold text-[#406386] line-clamp-2">
							<span>Favorite Locations:</span>
							<button
								onClick={() => setShowFavoritesSidebar((prev) => !prev)}
								className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
							>
								{showFavoritesSidebar ? 'Hide Sidebar' : 'View All Favorites'}
							</button>
						</div>
					}
					cardClassName='w-[89%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
				>
                    <div className="flex flex-col gap-4 ">
                        {loadingFavorites ? (
                            <p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
                        ) : favoriteLocations.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No favorite locations yet. Visit the map to add some!</p>
                        ) :(favoriteLocations.slice(0,5).map((loc, i) => (
                                <div key={i} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-neutral-800/80 transition-colors">
                                    <div className="flex-1 min-w-0 md:pr-4 cursor-pointer" onClick={() => navigate(buildMapRouteUrl(loc))}>
                                        <h3 className="text-lg font-bold text-cyan-400/80">{loc.name}</h3>
										<p className="text-gray-400 text-sm">{loc.address}</p>
										<LocationDetailBlock loc={loc} />
										{loc.categories && loc.categories.length > 0 && (
											<p className="text-gray-500 text-xs mt-2">
												{loc.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')}
											</p>
										)}
                                    </div>
                                    <div className="mt-2 md:mt-0 md:self-center shrink-0 flex flex-col items-end gap-2">
										<button
											style={{height: '36px',width:"36px",padding:"4px"}}
											onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(loc.lid); }}
											className="flex items-center justify-center rounded-md border border-red-400/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
											aria-label="Remove favorite"
										>
                                            <HeartMinus size={16} className="text-red-400" />
                                        </button>
                                    </div>
                                </div> 
                            ))
						)}
                    </div>
                </Card>
				<Card
					title={
						<div className="flex items-center justify-between gap-3 text-3xl font-bold text-[#406386] line-clamp-2">
							<span>Saved Coupons:</span>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setShowCouponsSidebar((prev) => !prev)}
									className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
								>
									{showCouponsSidebar ? 'Hide Sidebar' : 'View Saved'}
								</button>
								<button
									onClick={() => navigate('/discount', { state: { from: 'dashboard' } })}
									className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
								>
									Go to Coupons
								</button>
							</div>
						</div>
					}
					cardClassName='w-[89%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'
				>
					 <div className="flex flex-col gap-4 ">
						{couponPreviews.length === 0 ? (
							<p className="text-gray-400 text-center py-4">No saved coupons yet. Save them from the Coupons page.</p>
						) : couponPreviews.map((coupon) => (
							<div
								key={`coupon-preview-${coupon.index}-${coupon.loc.lid}`}
								className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-neutral-800/80 transition-colors"
							>
								<div className="min-w-0">
									<p className="text-cyan-200 font-semibold">{coupon.loc.name}</p>
									<p className="text-xs text-gray-300">{coupon.title} • {coupon.label}</p>
									<p className="text-xs text-gray-400">Code: {coupon.code}</p>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => unsaveCouponByKey(coupon.key)}
										className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/22 transition-colors"
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
				<div>
				<Card title='Recently Visited:' cardClassName='w-[95%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
					<div className="flex flex-col gap-4 ">
						{loadingVisited ? (
							<p className="text-gray-400 text-center py-4">Loading visited locations...</p>
						) : visitedLocations.length === 0 ? (
							<p className="text-gray-400 text-center py-4">No visited locations yet. Navigate somewhere on the map!</p>
						) : (
							visitedLocations.slice(0,5).map((loc, i) => (
								<div key={i} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-neutral-800/80 transition-colors">
									<div className="flex-1 min-w-0 md:pr-4 cursor-pointer" onClick={() => navigate(buildMapRouteUrl(loc))}>
										<h3 className="text-lg font-bold text-cyan-400/80">{loc.name}</h3>
										<p className="text-gray-400 text-sm">{loc.address}</p>
										<div className="mt-2.5 grid grid-cols-6 gap-1.5 text-[11px] leading-snug">
											<div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Phone: {loc.phone || 'N/A'}</div>
											<div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Email: {loc.email || 'N/A'}</div>
											<div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
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
											<div className="col-span-3 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
												Socials: {loc.socials && loc.socials.length > 0 ? loc.socials.slice(0, 3).map((social) => social.platform).join(', ') : 'N/A'}
											</div>
											<div className="col-span-3 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
												Hours: {formatBusinessHoursForDisplay(loc.businessHours, 2).length > 0 ? formatBusinessHoursForDisplay(loc.businessHours, 2).join(' | ') : 'N/A'}
											</div>
										</div>
										<p className="text-cyan-200/70 text-xs mt-1">Visited: {formatVisitedAt(loc.visited_at)}</p>
										{loc.categories && loc.categories.length > 0 && (
											<p className="text-gray-500 text-xs mt-2">
												{loc.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')}
											</p>
											
										)}
									</div>
									<div className="mt-3 md:mt-0 md:self-center shrink-0 flex flex-col gap-2">
										<button
											onClick={() => navigate(`/reviews?locationId=${encodeURIComponent(String(loc.lid))}`)}
											className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/25 transition-colors"
										>
											Review This Visit
										</button>
										<div className="flex items-center gap-2">
											<button
												onClick={() => navigate('/discount', { state: { from: 'dashboard', locationId: loc.lid } })}
												className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/25 transition-colors"
											>
												Get Coupon
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
						)
						}
					</div>
				</Card>
				</div>
			</div>
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
			{showCouponsSidebar && (
				<div className={`fixed top-20 bottom-3 z-[1500] w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl ${showFavoritesSidebar ? 'right-[370px]' : 'right-2'}`}>
					<div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
						<h3 className="text-cyan-300 text-lg font-semibold">Saved Coupons</h3>
						<button
							onClick={() => setShowCouponsSidebar(false)}
							className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
						>
							✕
						</button>
					</div>
					<div className="h-[calc(100%-48px)] overflow-y-auto pr-1">
						{couponPreviews.length === 0 ? (
							<p className="text-gray-400 text-center py-4">No saved coupons yet.</p>
						) : (
							couponPreviews.map((coupon) => (
								<div
									key={`saved-coupon-${coupon.loc.lid}-${coupon.code}`}
									className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 hover:bg-neutral-800/80 transition-colors"
								>
									<div className="flex items-center justify-between gap-3">
										<div
											className="cursor-pointer flex-1 min-w-0 pr-2"
											onClick={() => {
												navigate('/discount', { state: { from: 'dashboard', locationId: coupon.loc.lid } });
												setShowCouponsSidebar(false);
											}}
										>
											<h4 className="text-cyan-300 text-lg font-semibold">{coupon.loc.name}</h4>
											<p className="text-gray-300 text-xs">{coupon.title} • {coupon.label}</p>
											<p className="text-gray-400 text-xs">Code: {coupon.code}</p>
										</div>
										<button
											onClick={(e) => {
												e.stopPropagation();
												unsaveCouponByKey(coupon.key);
											}}
											className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/22 transition-colors"
											aria-label="Unsave coupon"
											title="Unsave coupon"
										>
											<BookmarkCheck size={16} className="text-cyan-200" />
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
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
