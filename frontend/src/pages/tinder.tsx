import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Navbar from '../components/navbar';
import Card from '../components/card';
import { HeartPlus, MapPin, House} from 'lucide-react';
import { X } from 'lucide-react';
import { getCommonsImage } from '../utils/getCommonsImage';
import {useNavigate } from 'react-router-dom';
import Links from '../components/links';

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
}

const TinderPage = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const [swipeCount, setSwipeCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [likedLocations, setLikedLocations] = useState<Business[]>([]);
    const [userLoc, setUserLoc] = useState({ lat: 34.0731, lng: -118.4016 });
    const [showSidebar, setShowSidebar] = useState(false);
    const navigate = useNavigate();

    const { scrollY } = useScroll();
	const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
    const marginBottom = useTransform(scrollY, [0, 100], ["0px", "12px"]);
	const borderRadius = useTransform(scrollY, [0, 100], ["0px", "24px"]);
	const right = useTransform(scrollY, [0, 100], ["0px", "1%"]);
	const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);

    const fetchBusinesses = async () => {
        setError(null);

        try {
            const response = await fetch('http://localhost:5173/recc/ranked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    latitude: userLoc.lat,
                    longitude: userLoc.lng,
                    radius_mi: 20,
                    limit: 10
                })
            });
            if (response.ok) {
                const data = await response.json();
                const businessesWithImages = await Promise.all(
                    data.ranked_locations.map(async (result: Business) => {
                        let imageUrl = '';
                        const name = result.name;
                        const address = result.address;
                        if (name && address) {
                            imageUrl = (await getCommonsImage(`${name} ${address}`)) || '';
                        }
                        return { ...result, imageUrl };
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
        fetchBusinesses();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && currentIndex < businesses.length) {
                setSwipeDirection('left');
            } else if (e.key === 'ArrowRight' && currentIndex < businesses.length) {
                setSwipeDirection('right');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, businesses.length]);

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

    async function handleAnimationComplete() {
        if (swipeDirection === 'left') {
            await updatePreferences('dislike', { classifications: businesses[currentIndex].classifications });
        } else if (swipeDirection === 'right') {
            await updatePreferences('like', { classifications: businesses[currentIndex].classifications });
            setLikedLocations(prev => {
                const isAlreadyLiked = prev.some(loc => 
                    loc.name === businesses[currentIndex].name && 
                    loc.address === businesses[currentIndex].address
                );
                if (!isAlreadyLiked) {
                    return [...prev, businesses[currentIndex]];
                }
                return prev;
            });
            console.log(likedLocations);
            setShowSidebar(true);
        }

        if (swipeDirection) {
            setCurrentIndex(currentIndex + 1);
            setSwipeDirection(null);
            const newSwipeCount = swipeCount + 1;
            setSwipeCount(newSwipeCount);
            if (newSwipeCount % 5 === 0) {
                fetchBusinesses();
            }
        }
    };



    function titleCase(str:string) {
        var splitStr = str.toLowerCase().split(' ');
        for (var i = 0; i < splitStr.length; i++) {
            
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
        }
        return splitStr.join(' '); 
    }

    const currentBusiness = businesses[currentIndex];
    const nextBusiness = businesses[Math.min(currentIndex + 1, businesses.length - 1)];

    return (
        <>
            <div className="min-h-screen bg-neutral-900 relative w-full">
                <Navbar page="Findr">
                    <Links link="/map">
                        Map<MapPin size={22}/>
                    </Links>
                    <Links link="/dashboard">
                        Dashboard <House size={17} />
                    </Links>
                    
                </Navbar>
                
                <div className="fixed backdrop-blur-[1000px] inset-0 bg-neutral-800 pointer-events-none w-full z-0 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0.4, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
                        <div className="absolute bottom-[-500px] w-full h-full bg-linear-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
                        <div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-linear-to-b from-cyan-50/40 via-cyan-100/40 blur-[120px] rounded-full" />
                    </motion.div>
                </div>

                <div className="from-cyan-700/70 via-cyan-500/70 to-purple-400/70 relative z-10 pt-20 pb-32 h-screen flex items-center justify-center">
                    <AnimatePresence>
                        {currentBusiness && (
                            <motion.div
                                key={currentIndex}
                                initial={{ x: 0, opacity: 1 }}
                                animate={{
                                    x: swipeDirection === 'left' ? -1000 : swipeDirection === 'right' ? 1000 : 0,
                                    opacity: swipeDirection ? 0 : 1
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                onAnimationComplete={handleAnimationComplete}
                                className="w-full max-w-2xl px-4"
                            >
                                <Card
                                    title={currentBusiness.name || 'Unknown Business'}
                                    image={currentBusiness.imageUrl}
                                    imageHeight="1000px"
                                    cardClassName="w-full"
                                    bgcolor="#016786ff"
                                    titleClassName='text-white'
                                >
                                    <div className="space-y-4">
                                        <div className="bg-white/10 p-4 rounded-lg">
                                            <p className="text-white"><strong>Address:</strong> {currentBusiness.address || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-lg">
                                            <p className="text-white"><strong>Distance:</strong> {(currentBusiness.distance_meters / 1609.34).toFixed(2)} miles</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-lg">
                                            <p className="text-white"><strong>Categories:</strong> {currentBusiness.category?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                        </div>
                                        
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {error ? <p className="text-red-400 text-center mt-8">{error}</p> : businesses.length === 0 && currentBusiness === undefined && <p className="text-white text-center">Loading...</p>}
                </div>

                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-32"> 
                    <motion.button
                        onClick={() => setSwipeDirection('left')}
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

                    <motion.button
                        onClick={() => setSwipeDirection('right')}
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
                            style={{
                                marginTop,
                                marginBottom,
                                right,
                                backgroundColor: bgColor,
                                borderTopLeftRadius: borderRadius,
                                borderBottomLeftRadius: borderRadius,
                            }}
                            className="fixed top-19 bottom-0 w-80 shadow-lg z-40 flex flex-col backdrop-blur-md"
                        >
                            <div className="flex justify-between items-center p-4 border-b border-white/10">
                                <h2 className="text-xl font-bold text-neutral-400">Liked Locations</h2>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-neutral-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {likedLocations.map((loc, index) => (
                                    
                                    <div
                                        key={index}
                                        className="mb-4 p-3 bg-neutral-800/50 border border-white/10 rounded-xl cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                        onClick={() => navigate(`/map?lat=${loc.latitude}&lon=${loc.longitude}`)}
                                    >
                                        <h3 className="font-bold text-cyan-400">{loc.name}</h3>
                                        <p className="text-sm text-neutral-400">{loc.address}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

export default TinderPage;