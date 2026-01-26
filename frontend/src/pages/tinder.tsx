import { useEffect, useState } from 'react';
import { services } from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import { motion, AnimatePresence, color } from 'framer-motion';
import Navbar from '../components/navbar';
import Card from '../components/card';
import {HeartPlus} from 'lucide-react';
import { X } from 'lucide-react';
import { getCommonsImage } from '../utils/getCommonsImage';


const API_KEY = import.meta.env.VITE_TOMTOM_API_KEY

interface Business {
    poi?: {
        name?: string;
        phone?: string;
        categories?: string[];
        id?: string;
    };
    address?: {
        freeformAddress?: string;
    };
    imageUrl?: string;
}

const TinderPage = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);


    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const response = await services.fuzzySearch({
                    key: API_KEY,
                    query: 'restaurant',
                    center: [-74.0060, 40.7128], 
                    limit: 10
                });
                const results = response.results || [];
                const businessesWithImages = await Promise.all(
                results.map(async (result) => {
                    let imageUrl = '';

                    const name = result.poi?.name;
                    const address = result.address?.freeformAddress;

                    if (name && address) {
                    imageUrl =
                        (await getCommonsImage(`${name} ${address}`)) ||
                        '';
                    }

                    return { ...result, imageUrl };
                })
                );

                setBusinesses(businessesWithImages);
            } catch (error) {
                console.error('Error fetching businesses:', error);
            }
        };
        fetchBusinesses();
    }, []
);

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

    async function handleAnimationComplete() {
        if (swipeDirection=='left'){
            //save in database as interested location

        }

        if (swipeDirection) {
            setCurrentIndex(currentIndex + 1);
            setSwipeDirection(null);
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
                                        title={currentBusiness.poi?.name || 'Unknown Business'}
                                        className="flex justify-center "
                                        
                                    >

                                        {currentBusiness.imageUrl && (
                                            <div style={{marginTop:'10px', marginBottom:'10px'}}>
                                                <img src={currentBusiness.imageUrl} alt="Business" style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'12px'}} />
                                            </div>
                                        )}
                                        <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                            <p style={{color:'white'}}><strong>Address:</strong> {currentBusiness.address?.freeformAddress || 'N/A'}</p>
                                        </div>
                                        <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                            <p style={{color:'white'}}><strong>Phone:</strong> {currentBusiness.poi?.phone || 'N/A'}</p>
                                        </div>
                                        <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                            <p style={{color:'white'}}><strong>Categories:</strong> {currentBusiness.poi?.categories?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                        </div>
                                    </Card>

                                    </div>




                                    



                                <Card
                                    title={nextBusiness.poi?.name || 'Unknown Business'}
                                    className="flex justify-center"
                                >
                                    {nextBusiness.imageUrl && (
                                        <div style={{marginTop:'10px', marginBottom:'10px'}}>
                                            <img src={nextBusiness.imageUrl} alt="Business" style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'12px'}} />
                                        </div>
                                    )}
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Address:</strong> {nextBusiness.address?.freeformAddress || 'N/A'}</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                        <p style={{color:'white'}}><strong>Phone:</strong> {nextBusiness.poi?.phone || 'N/A'}</p>
                                    </div>
                                    <div style={{marginTop:'10px',backgroundColor:'rgba(255, 255, 255, 0.1)',padding:'10px',borderRadius:'12px'}}>
                                         <p style={{color:'white'}}><strong>Categories:</strong> {nextBusiness.poi?.categories?.map(category => titleCase(category)).join(', ') || 'N/A'}</p>
                                    </div>
                                </Card>

                                </div>

                                
             
                                
                            </motion.div>
                        )}

                    </AnimatePresence>
                    {businesses.length === 0 && <p>Loading...</p>}
                </div>

                <div style={{marginBottom:260,display:"flex",justifyItems:"space-between",gap:800,alignItems:"center"}} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"> 
                    <div>
                        <HeartPlus
                            size={250}
                            style={{ color: "rgba(1, 255, 47, 0.8)" }}
                            className="cursor-pointer hover:scale-110 transition"
                        />
                    </div>


                    <div>
                        <X
                            size={300}
                            style={{ color: "rgba(240, 0, 0, 0.8)" }}
                            className="cursor-pointer hover:scale-110 transition"
                        />
                    </div>

                </div>
            </div>
        </>
    );
}

export default TinderPage;