import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import Card from '../components/card';
import { HeartPlus, MapPin, House, X } from 'lucide-react';
import { getCommonsImage } from '../utils/getCommonsImage';
import {useNavigate } from 'react-router-dom';
import Links from '../components/links';
import Body from '../components/body';
import { enqueueAlert } from '../components/alerts';
import LocalAiChatPopup from '../components/localAiChatPopup';

interface Business {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distance_meters: number;
    category: string[];
    score: number;
    classifications: any[];
    imageUrl?: string;
    lid?: number;
    phone?: string;
    email?: string;
    website?: string;
    socials?: string[];
    businessHours?: string[];
}
interface Location {
	lid: number;
	name: string;
	longitude: number;
	latitude: number;
	type: number;
	address?: string;
	categories?: string[];
	time?: string;
    phone?: string;
    email?: string;
    website?: string;
    socials?: string[];
    businessHours?: string[];
}


const TinderPage = () => {
    const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
    const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
    const [user, setUser] = useState<{ uid: string, username: string } | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const [, setSwipeCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [likedLocations, setLikedLocations] = useState<Business[]>([]);
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: 34.0731, lng: -118.4016 });
    const [showSidebar, setShowSidebar] = useState(false);
    const isSavingRef = useRef(false);
    const processedSwipeRef = useRef<string | null>(null);
    const navigate = useNavigate();
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
    const [edgeGlow, setEdgeGlow] = useState<"left" | "right" | null>(null);
    const handlePress = (side: "left" | "right") => {
        setEdgeGlow(side);

        setTimeout(() => {
            setEdgeGlow(null);
        }, 600);
    };
    const triggerSwipe = (side: "left" | "right") => {
        if (swipeDirection || currentIndex >= businesses.length) return;
        setSwipeDirection(side);
        handlePress(side);
    };
    useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, {
					credentials: 'include'
				});
				if (response.ok) {
					const data = await response.json();
					setUser(data);
				} else {
					navigate('/login');
				}
			} catch (error) {
				console.error('Error fetching profile:', error);
				navigate('/login');
			}
		};
		fetchProfile();
	}, [navigate, AUTH_BASE_URL]);

    const fetchFavoriteLocations = async () => {
		setLoadingFavorites(true);
		try {
			const response = await fetch('http://localhost:5173/loc/favorites', {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setFavoriteLocations(data);
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

    useEffect(() => {
		if (user) {
			fetchFavoriteLocations();
		}
	}, [user]);

    const buildStaticMapImage = (lng: number, lat: number) =>
        TOMTOM_API_KEY
            ? `https://api.tomtom.com/map/1/staticimage?key=${TOMTOM_API_KEY}&layer=basic&style=main&center=${lng},${lat}&zoom=16&width=420&height=260&format=png`
            : '';

    const fetchBusinesses = async (coords: { lat: number; lng: number }) => {
        setError(null);
        if (!coords) return;
        try {
            const response = await fetch('http://localhost:5173/recc/ranked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radius_mi: 20,
                    limit: 8
                })
            });
            if (response.ok) {
                const data = await response.json();
                const businessesWithImages = await Promise.all(
                    data.ranked_locations.map(async (result: Business) => {
                        const socialCandidates = (result as any)?.socials;
                        const normalizedSocials: string[] = Array.isArray(socialCandidates)
                            ? socialCandidates
                                  .map((entry: any) =>
                                      typeof entry === 'string'
                                          ? entry
                                          : typeof entry?.url === 'string'
                                          ? entry.url
                                          : typeof entry?.platform === 'string'
                                          ? entry.platform
                                          : ''
                                  )
                                  .filter((entry: string) => entry.trim().length > 0)
                            : [];
                        let imageUrl = '';
                        const name = result.name;
                        const address = result.address;
                        if (name && address) {
                            imageUrl = (await getCommonsImage(`${name} ${address}`)) || '';
                        }
                        if (!imageUrl) {
                            imageUrl = buildStaticMapImage(result.longitude, result.latitude);
                        }
                        return {
                            ...result,
                            imageUrl,
                            phone: (result as any)?.phone || (result as any)?.contact?.phone,
                            email: (result as any)?.email || (result as any)?.contact?.email,
                            website: (result as any)?.website || (result as any)?.url,
                            socials: normalizedSocials.length > 0 ? normalizedSocials : undefined,
                        };
                    })
                );
                setBusinesses(businessesWithImages);
                setCurrentIndex(0);
            } else {
                setError('Failed to fetch ranked locations. Please ensure you are logged in.');
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
            setError('Error fetching businesses. Check console for details.');
        }
    };

    useEffect(() => {
        const handleLocation = (lat: number, lng: number) => {
            const coords = { lat, lng };
            setUserLoc(coords);
            fetchBusinesses(coords); 
        };
    
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => handleLocation(pos.coords.latitude, pos.coords.longitude),
                (error) => {
                    console.warn('Geolocation denied, using fallback', error.message);
                    setError(`Location error: ${error.message}. Using default.`);
                    handleLocation(34.0731, -118.4016);
                },
                { timeout: 10000 } 
            );
        } else {
            handleLocation(34.0731, -118.4016);
        }
    }, []); 

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && currentIndex < businesses.length) {
                triggerSwipe('left');
            } else if (e.key === 'ArrowRight' && currentIndex < businesses.length) {
                triggerSwipe('right');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, businesses.length, swipeDirection]);

    const updatePreferences = async (action: string, poi: any) => {
        try {
            await fetch('http://localhost:5173/recc/update_preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action, poi })
            });
        } catch (error) {
            console.error('Error updating preferences:', error);
        }
    };

    const addToFavorites = async (business: Business) => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        
        try {
            const createResponse = await fetch('http://localhost:5173/loc/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: business.name,
                    address: business.address,
                    longitude: business.longitude,
                    latitude: business.latitude,
                    type: 1,
                    categories: business.category,
                })
            });

            if (createResponse.ok) {
                const locationData = await createResponse.json();
                const locationId = locationData.location_id;
                const favoriteResponse = await fetch(`http://localhost:5173/loc/${locationId}/favorite`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (favoriteResponse.ok) {
                    enqueueAlert({ message: "Location saved to favorites.", textColor: "text-green-300" });
                } else {
                    console.error('Failed to add to favorites');
                    enqueueAlert({ message: "Failed to add favorite.", textColor: "text-red-300" });
                }
            } else {
                console.error('Failed to create location');
                enqueueAlert({ message: "Failed to create location.", textColor: "text-red-300" });
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            enqueueAlert({ message: "Error saving favorite.", textColor: "text-red-300" });
        } finally {
            isSavingRef.current = false;
        }
    };

    async function handleAnimationComplete() {
        if (!swipeDirection) return;
        const currentBusiness = businesses[currentIndex];
        if (!currentBusiness) return;

        const swipeKey = `${currentIndex}-${swipeDirection}`;
        if (processedSwipeRef.current === swipeKey) return;
        processedSwipeRef.current = swipeKey;

        if (swipeDirection === 'left') {
            await updatePreferences('dislike', { classifications: currentBusiness.classifications });
        } else if (swipeDirection === 'right') {
            await updatePreferences('like', { classifications: currentBusiness.classifications });
            
            await addToFavorites(currentBusiness);
            
            setLikedLocations(prev => {
                const isAlreadyLiked = prev.some(loc => 
                    loc.name === currentBusiness.name && 
                    loc.address === currentBusiness.address
                );
                if (!isAlreadyLiked) {
                    return [...prev, currentBusiness];
                }
                return prev;
            });
        }

        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
        setSwipeCount(prev => {
            const newSwipeCount = prev + 1;
            if (newSwipeCount % 5 === 0) {
                fetchBusinesses(userLoc);
            }
            return newSwipeCount;
        });
    };
    const buildMapRouteUrl = (loc: Location | Business) => {
        const params = new URLSearchParams({
            lat: String(loc.latitude),
            lon: String(loc.longitude),
            name: loc.name || '',
            address: loc.address || '',
        });
        return `/map?${params.toString()}`;
    };


    function titleCase(str:string) {
        const splitStr = str.toLowerCase().split(' ');
        for (let i = 0; i < splitStr.length; i++) {
            
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
        }
        return splitStr.join(' '); 
    }
    const prettyUrl = (value: string): string => value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const isStaticMapImage = (imageUrl?: string): boolean =>
        typeof imageUrl === 'string' && imageUrl.includes('api.tomtom.com/map/1/staticimage');
    const getOtherDetailsLine = (business: Business): string => {
        const parts: string[] = [];
        if (business.website) parts.push(`Website: ${prettyUrl(business.website)}`);
        if (business.socials && business.socials.length > 0) parts.push(`Social: ${business.socials[0]}`);
        if (business.phone) parts.push(`Phone: ${business.phone}`);
        if (business.email) parts.push(`Email: ${business.email}`);
        return parts.length > 0 ? parts.join(' | ') : 'Other Details: N/A';
    };
    const renderFavoriteDetails = (loc: Partial<Location & Business>) => {
        const hours = loc.businessHours && loc.businessHours.length > 0
            ? loc.businessHours.slice(0, 2).join(' | ')
            : 'N/A';
        const socials = loc.socials && loc.socials.length > 0
            ? loc.socials.slice(0, 2).join(', ')
            : 'N/A';
        return (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11px] leading-snug">
                <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Phone: {loc.phone || 'N/A'}</div>
                <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">Email: {loc.email || 'N/A'}</div>
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
                <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">Socials: {socials}</div>
                <div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">Hours: {hours}</div>
            </div>
        );
    };
    const currentBusiness = businesses[currentIndex];
    const uniqueFavoriteLocations = useMemo(() => {
        const seen = new Set<string>();
        return favoriteLocations.filter((loc) => {
            const key = loc.lid
                ? `lid:${loc.lid}`
                : `name:${(loc.name || '').trim().toLowerCase()}|addr:${(loc.address || '').trim().toLowerCase()}|lat:${loc.latitude}|lon:${loc.longitude}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [favoriteLocations]);

    const uniqueLikedLocations = useMemo(() => {
        const seen = new Set<string>(
            uniqueFavoriteLocations.map((loc) =>
                loc.lid
                    ? `lid:${loc.lid}`
                    : `name:${(loc.name || '').trim().toLowerCase()}|addr:${(loc.address || '').trim().toLowerCase()}|lat:${loc.latitude}|lon:${loc.longitude}`
            )
        );
        return likedLocations.filter((loc) => {
            const key = `name:${(loc.name || '').trim().toLowerCase()}|addr:${(loc.address || '').trim().toLowerCase()}|lat:${loc.latitude}|lon:${loc.longitude}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [likedLocations, uniqueFavoriteLocations]);

    return (
            <Body className="overscroll-none">
                <Navbar page="Findr">
                    <Links link="/map">
                        Map<MapPin size={22}/>
                    </Links>
                    <Links link="/dashboard">
                        Dashboard <House size={17} />
                    </Links>
                    <Links link="/reviews">
                        Reviews
                    </Links>
                    
                </Navbar>
                <AnimatePresence>
                    {edgeGlow === "right" && (
                        <motion.div
                            key="right-glow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 2, 0] }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-y-0 right-0 w-[350px] pointer-events-none z-30"
                        >
                            <div className="absolute right-[-200px] top-1/2 -translate-y-1/2 
                                w-[600px] h-[800px] 
                                bg-gradient-to-l from-green-500/40 to-transparent 
                                blur-[160px] rounded-full"
                            />
                        </motion.div>
                    )}

                    {edgeGlow === "left" && (
                        <motion.div
                            key="left-glow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 2, 0] }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-y-0 left-0 w-[350px] pointer-events-none z-30"
                        >
                            <div className="absolute left-[-200px] top-1/2 -translate-y-1/2 
                                w-[600px] h-[800px] 
                                bg-gradient-to-r from-red-500/40 to-transparent 
                                blur-[160px] rounded-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="from-cyan-700/70 via-cyan-500/70 to-purple-400/70 z-10 pt-28 pb-32 h-screen flex flex-col items-center">
                    <div className="relative z-40 w-full max-w-[1120px] px-4 mt-6 mb-12">
                        <div className="rounded-2xl border border-cyan-400/20 bg-neutral-900/55 p-2 shadow-lg backdrop-blur-sm">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="rounded-full border border-rose-400/35 bg-rose-500/12 px-4 py-2 text-sm font-semibold text-rose-100 text-center">
                                    Left swipe: Skip this location
                                </div>
                                <div className="rounded-full border border-cyan-400/35 bg-cyan-500/12 px-4 py-2 text-sm font-semibold text-cyan-100 text-center">
                                    Use sidebar to open routes
                                </div>
                                <div className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-4 py-2 text-sm font-semibold text-emerald-100 text-center">
                                    Right swipe: Add to favorites
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full flex-1 flex items-start justify-center pt-6">
                        <AnimatePresence>
                            {currentBusiness && (
                                <motion.div
                                    key={currentIndex}
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
                                        title={currentBusiness.name || 'Unknown Business'}
                                        cardClassName="w-[1040px] max-w-[97vw]"
                                        bgcolor="#016786ff"
                                        titleClassName='text-white'
                                    >
                                        <div className="space-y-4">
                                            <div className="bg-white/10 p-5 rounded-xl border border-cyan-200/20 flex items-center gap-5 min-h-[182px]">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm leading-relaxed"><strong>Address:</strong> {currentBusiness.address || 'N/A'}</p>
                                                    <p className="text-white text-sm leading-relaxed"><strong>Distance:</strong> {(currentBusiness.distance_meters / 1609.34).toFixed(2)} miles</p>
                                                    <p className="text-white text-sm leading-relaxed"><strong>Categories:</strong> {currentBusiness.category?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                                    <p className="text-cyan-50 text-sm mt-2 truncate"><strong>{getOtherDetailsLine(currentBusiness)}</strong></p>
                                                </div>
                                            {currentBusiness.imageUrl && (
                                                <div className="relative w-[176px] h-[126px] rounded-xl overflow-hidden border-2 border-cyan-300/75 shadow-[0_0_0_2px_rgba(34,211,238,0.2)] shrink-0">
                                                    <img
                                                        src={currentBusiness.imageUrl}
                                                        alt={currentBusiness.name || 'Location'}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                    {isStaticMapImage(currentBusiness.imageUrl) && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <MapPin size={30} strokeWidth={2.4} className="text-cyan-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {error ? <p className="text-red-400 text-center mt-4">{error}</p> : businesses.length === 0 && currentBusiness === undefined && <p className="text-white text-center mt-4">Loading...</p>}
                </div>

                <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-16"> 
                    <motion.button
                        onClick={() => triggerSwipe('left')}
                        animate={{
                            scale: swipeDirection === 'left' ? [1, 3, 1] : 1
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: swipeDirection === 'left' ? 1 : 0,
                            ease: "easeInOut"
                        }}
                        className="cursor-pointer hover:scale-110 transition active:scale-125 focus:outline-none"
                        aria-label="Dislike"
                    >
                        <X
                            size={150}
                            className="text-red-500 drop-shadow-lg"
                        />
                    </motion.button>
                    <button className="px-4 py-4 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={()=>setShowSidebar(!showSidebar)}>
                        Show Favorite Locations
                    </button>
                    <motion.button
                        onClick={() => triggerSwipe('right')}
                        animate={{
                            scale: swipeDirection === 'right' ? [1, 3, 1] : 1
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: swipeDirection === 'right' ? 1 : 0,
                            ease: "easeInOut"
                        }}
                        className="cursor-pointer hover:scale-110 transition active:scale-150 focus:outline-none"
                        aria-label="Like"
                    >
                        <HeartPlus
                            size={120}
                            className="text-green-500 drop-shadow-lg"
                        />
                    </motion.button>
                </div>

                <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-28 bottom-2 right-2 z-[1500] w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                                <h3 className="text-cyan-300 text-lg font-semibold">All Favorited Locations</h3>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="h-[calc(100%-48px)] overflow-y-auto pr-1">

                                {loadingFavorites ? (
                                    <p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
                                ) : uniqueFavoriteLocations.length === 0 && uniqueLikedLocations.length===0? (
                                    <p className="text-gray-400 text-center py-4">No favorite locations yet. Visit the map to add some!</p>
                                ) : (
                                    uniqueFavoriteLocations.map((loc, i) => (
                                        <div key={i} className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 hover:bg-neutral-800/80 transition-colors">
                                            <div className="flex-1 cursor-pointer " onClick={() => navigate(buildMapRouteUrl(loc))}>
                                                <h4 className="text-cyan-300 text-lg font-semibold">{loc.name}</h4>
                                                <p className="text-gray-400 text-sm">{loc.address}</p>
                                                {renderFavoriteDetails(loc)}
                                            </div>
                                        </div> 
                                    ))
                                )}
                                {uniqueLikedLocations.length!==0&&(<p className="text-gray-400 text-center py-4">New Locations Liked</p>)}
                                {uniqueLikedLocations.map((loc, index) => (
                                    <div
                                        key={index}
                                        className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                        onClick={() => navigate(buildMapRouteUrl(loc))}
                                    >
                                        <h4 className="text-cyan-300 text-lg font-semibold">{loc.name}</h4>
                                        <p className="text-gray-400 text-sm">{loc.address}</p>
                                        {renderFavoriteDetails(loc)}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <LocalAiChatPopup
                    userName={user?.username}
                    activePage="findr"
                    currentLocation={userLoc}
                    favoriteLocations={favoriteLocations.map((loc) => ({
                        name: loc.name,
                        address: loc.address,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                    }))}
                    visitedLocations={[]}
                    likedLocations={likedLocations.map((loc) => ({
                        name: loc.name,
                        address: loc.address,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                    }))}
                    selectedPois={currentBusiness ? [{
                        name: currentBusiness.name,
                        address: currentBusiness.address,
                        latitude: currentBusiness.latitude,
                        longitude: currentBusiness.longitude,
                    }] : []}
                    activeSelectionLabel={currentBusiness?.name}
                />
            </Body>
    );
}

export default TinderPage;
