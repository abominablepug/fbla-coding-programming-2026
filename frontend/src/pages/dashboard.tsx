import React, { useEffect, useRef, useState } from 'react';
import {motion} from "framer-motion";
import Card from "../components/card";
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import {Heart, MapPin} from 'lucide-react';
import pfp from "/Users/patelb/fbla25-project/backend/static/profile_pictures/default_profile_picture.png";

const Dashboard=()=>{
    const [user, setUser] = useState<{uid: string, username: string} | null>(null);
    const navigate = useNavigate();
    const favoriteLocations = [
        {
            name: "Public Art 'Iron Root'",
            address: "North Crescent Drive, Beverly Hills, CA 90210",
            time: "10:15 AM"
        },
        {
            name: "Public Art 'Sitting Figure on A Short Bench'",
            address: "Santa Monica Boulevard & North Beverly Drive, Beverly Hills, CA 90210",
            time: "12:15 PM"
        },
        {
            name: "Beverly Gardens Park",
            address: "Santa Monica Boulevard, Beverly Hills, CA 90210",
            time: "12:20 PM"
        },
        {
            name: "Picsil",
            address: "Santa Monica Boulevard, Beverly Hills, CA 90210",
            time: "4:15 PM"
        }
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('http://localhost:5173/auth/dashboard', {
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
    }, [navigate]);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await fetch('http://localhost:5173/auth/logout', {
                credentials: 'include'
            });
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/');
        }
    };

    if (!user) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;

    return(
        <div className="min-h-screen bg-neutral-900 relative w-full overscroll-none">
            <div className=" min-h-screen w-full fixed bg-neutral-900 backdrop-blur-[400px] flex items-center justify-center overflow-hidden">
                <motion.div initial={{ opacity: 0.4, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
                    <div className="absolute bottom-[-500px] w-full h-full bg-linear-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
                </motion.div>
                <motion.div initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
                    <div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-linear-to-b from-cyan-700/40 via-cyan-500/40 to-purple-400/40 blur-[120px] rounded-full" />
                </motion.div>
            </div>
            <Navbar page="Dashboard">
                <Links link="map">
                    Map <MapPin size={22}/>
                </Links>
                <Links link="tinder">
                    Findr <Heart size={22}/>
                </Links>
                <Links link="/" onClick={handleLogout}>
                    Logout →
                </Links> 
            </Navbar>
            <div className="w-full relative grid gap-11 pt-28">
                <Card title={`Welcome ${user.username}`}  titleClassName='text-cyan-500' cardClassName='w-[95%]'>
                    <p>Scroll Down to view your Account Details and Favorite Locations!</p>
                </Card>
                <Card title='Account Info:' cardClassName='w-[75%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
                <div className="grid grid-cols-1 gap-y-3 place-items-center text-center">
                    <img className="rounded-full border-4 w-32 h-32 object-cover shadow-w-auto border-cyan-600 hover:border-cyan-700 transition-transform" src={pfp} alt="Profile"/>
                    <p className="text-gray-400 text-xl">User ID: {user.uid}</p>
                    <p className="text-gray-400 text-xl">Username: {user.username}</p>
                    <div className="flex flex-wrap justify-center gap-4 mt-4 w-full">
                        <button className="px-6 py-4 bg-sky-500 text-white rounded-lg font-semibold text-lg transition-all hover:bg-sky-400 shadow-lg">
                            Change Profile Picture
                        </button>
                        <button className="px-6 py-4 bg-sky-500 text-white rounded-lg font-semibold text-lg transition-all hover:bg-sky-400 shadow-lg">
                            Change Password
                        </button>
                    </div>
                </div>
                </Card>
                <Card title='Favorite Locations:' cardClassName='w-[75%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
                <div className="flex flex-col gap-4 w-full">
                    {favoriteLocations.map((loc, i) => (
                        <div key={i} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
                            <div>
                                <h3 className="text-lg font-bold text-cyan-400">{loc.name}</h3>
                                <p className="text-sm text-gray-400">{loc.address}</p>
                            </div>
                            <div className="mt-2 md:mt-0 text-right">
                                <p className="text-sm text-gray-300 font-mono">Added: {loc.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
                </Card>
            </div>
        </div>
    )
};

export default Dashboard;
