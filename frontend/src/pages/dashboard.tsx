import React, { useEffect, useRef, useState } from 'react';
import {motion} from "framer-motion";
import Card from "../components/card";
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import {Heart, MapPin} from 'lucide-react';

const Dashboard=()=>{
    const [user, setUser] = useState<{uid: string, username: string} | null>(null);
    const navigate = useNavigate();

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
            <div className="w-full relative grid gap-8 pt-28">
                <Card title={`Welcome ${user.username}`} titleClassName=' text-cyan-500'>
                    <h1 className="text-gray-400 text-2xl">Your account infomation is below:</h1>
                    <div className="grid gap-2 grid-cols-2 mt-8 max:[gap-y-1">
                    <p className="text-gray-400 text-lg">Username: {user.username}</p>
                    <p className="text-gray-400 text-lg">User ID: {user.uid}</p>
                    </div>
                </Card>
            </div>
        </div>
    )
};

export default Dashboard;
