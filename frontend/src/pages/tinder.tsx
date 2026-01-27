import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import Card from '../components/card';
import { HeartPlus } from 'lucide-react';
import { X } from 'lucide-react';
import { getCommonsImage } from '../utils/getCommonsImage';
import { useNavigate } from 'react-router-dom';

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
                <Navbar page="Find Your Match!" />
                
                <div className="fixed backdrop-blur-[1000px] inset-0 bg-neutral-800 pointer-events-none w-full z-0 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0.4, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
                        <div className="absolute bottom-[-500px] w-full h-full bg-linear-to-t from-cyan-700/70 via-cyan-800/70 to-purple-400/70 blur-[160px] rounded-full" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
                        <div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-linear-to-b from-cyan-50/40 via-cyan-100/40 blur-[120px] rounded-full" />
                    </motion.div>
                </div>

                <div style={{ marginTop:"0px",alignItems: 'center',justifyContent:"center"}} className="from-cyan-700/70 via-cyan-500/70 to-purple-400/70 relative z-10 pt-20 pb-8 overflow-y-auto h-screen flex items-center justify-center">
                    <AnimatePresence>
                        {currentBusiness && (
                            <motion.div
                                key={currentIndex}
                                initial={{ x: 0, opacity: 2 }}
                                animate={{
                                    x: swipeDirection === 'left' ? -800 : swipeDirection === 'right' ? 800 : 0,
                                    opacity: swipeDirection ? 0 : 1
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                onAnimationComplete={handleAnimationComplete}
                                className="mb-8"
                            >
                                <div style={{display:"flex",justifyContent:"space-around"}}>
                                    <div style={{marginLeft:"1200px",marginRight:"600px"}}>
                                    <Card
                                    title={currentBusiness.name || 'Unknown Business'}
                                    className="flex justify-center "
                                    
                                >

                                    {currentBusiness.imageUrl && (
                                        <div style={{marginTop:'10px', marginBottom:'10px'}}>
                                            <img src={currentBusiness.imageUrl} alt="Business" style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'12px'}} />
                                        </div>
                                    )}
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Address:</strong> {currentBusiness.address || 'N/A'}</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Distance:</strong> {(currentBusiness.distance_meters / 1609.34).toFixed(2)} miles</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Categories:</strong> {currentBusiness.category?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                    </div>
                                </Card>

                                    </div>




                                    



                                <Card
                                    title={nextBusiness.name || 'Unknown Business'}
                                    className="flex justify-center"
                                >
                                    
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Address:</strong> {nextBusiness.address || 'N/A'}</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Distance:</strong> {(nextBusiness.distance_meters / 1609.34).toFixed(2)} miles</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                         <p style={{color:'white'}}><strong>Categories:</strong> {nextBusiness.category?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                    </div>
                                    {/*{nextBusiness.imageUrl && (
                                        <div style={{marginTop:'10px', marginBottom:'10px'}}>
                                            <img src={nextBusiness.imageUrl} alt="Business" style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'12px'}} />
                                        </div>
                                    )}*/}
                                </Card>

                                </div>

                                
             
                                
                            </motion.div>
                        )}

                    </AnimatePresence>
                    {error ? <p style={{color: 'red'}}>{error}</p> : businesses.length === 0 && <p>Loading...</p>}
                </div>

                <div style={{marginBottom:260,display:"flex",justifyItems:"space-between",gap:750,alignItems:"center"}} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"> 
    

                    <motion.div
                        animate={{
                            scale: swipeDirection === 'left' ? [1, 1.3, 1] : 1
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: swipeDirection === 'left' ? 1 : 0,
                            ease: "easeInOut"
                        }}
                    >
                        <X
                            size={400}
                            style={{ color: "rgba(240, 0, 0, 0.8)" }}
                            className="cursor-pointer hover:scale-110 transition"
                        />
                    </motion.div>




                    <motion.div
                        animate={{
                            scale: swipeDirection === 'right' ? [1, 1.3, 1] : 1
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: swipeDirection === 'right' ? 1 : 0,
                            ease: "easeInOut"
                        }}
                    >
                        <HeartPlus
                            size={300}
                            style={{ color: "rgba(1, 255, 47, 0.8)" }}
                            className="cursor-pointer hover:scale-110 transition"
                        />
                    </motion.div>




                </div>

                <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 flex flex-col"
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-bold">Liked Locations</h2>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {likedLocations.map((loc, index) => (
                                    
                                    <div
                                        key={index}
                                        className="mb-4 p-3 border rounded cursor-pointer hover:bg-gray-100"
                                        onClick={() => navigate(`/map?lat=${loc.latitude}&lon=${loc.longitude}`)}
                                    >
                                        <h3 className="font-semibold">{loc.name}</h3>
                                        <p className="text-sm text-gray-600">{loc.address}</p>
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