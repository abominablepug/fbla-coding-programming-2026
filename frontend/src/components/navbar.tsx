import React, { useEffect, useMemo, useState } from 'react';
import {motion} from "framer-motion";
import { Link, useLocation } from 'react-router-dom';
import { House, UserRound } from 'lucide-react';
import luminxLogo from '../assets/luminx-logo.png';

interface NavBarProps {
    page?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    cardClassName?: string;
    titleClassName?: string;
    contentClassName?: string;
}

const Navbar: React.FC<NavBarProps> = ({ page, children, className = ""}) => {
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userType, setUserType] = useState<'customer' | 'business'>('customer');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('Profile');
	const width = "98%";
	const borderRadius = "40px";
	const marginTop = "12px";
    const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

    useEffect(() => {
        let cancelled = false;
        const checkAuth = async () => {
            try {
                const response = await fetch(`${authBaseUrl}/auth/dashboard`, { credentials: 'include' });
                if (!cancelled) {
                    setIsAuthenticated(response.ok);
                    if (response.ok) {
                        const data = await response.json().catch(() => ({}));
                        setUserType(data.user_type === 'business' ? 'business' : 'customer');
                        setProfilePicture(data.profile_picture || null);
                        setUsername(data.username || 'Profile');
                    }
                }
            } catch {
                if (!cancelled) {
                    setIsAuthenticated(false);
                    setProfilePicture(null);
                    setUsername('Profile');
                }
            }
        };
        void checkAuth();
        return () => {
            cancelled = true;
        };
    }, [authBaseUrl, location.pathname]);

    const homePath = userType === 'business' ? '/business/dashboard' : '/dashboard';
    const brandLink = useMemo(() => {
        return isAuthenticated ? homePath : '/';
    }, [isAuthenticated, homePath]);
    const showHomeShortcut = isAuthenticated && location.pathname !== homePath;
    const profileImageSrc = profilePicture ? `${authBaseUrl}/static/profile_pictures/${profilePicture}` : '';

    return (
        <div className="fixed z-50 w-full top-0 pointer-events-none flex justify-center">
            <motion.div style={{ width, borderRadius, marginTop }} className="px-3 sm:px-4 flex items-center justify-between bg-neutral-950/90 border-b border-cyan-200/10 shadow-[0_14px_45px_rgba(0,0,0,0.28)] light:shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-md pointer-events-auto">
                <nav className="py-2 sm:py-2.5 px-1 sm:px-2 w-full flex items-center relative">
                    <span
                        style={{ fontFamily: 'var(--font-brand)' }}
                        className="font-semibold tracking-widest text-base sm:text-lg md:text-xl"
                    >
                        <Link to={brandLink} className="inline-flex items-center gap-0.5 sm:gap-1">
                            <img
                                src={luminxLogo}
                                alt="LuminX logo"
                                className="h-9 w-9 scale-115 object-contain drop-shadow-[0_0_12px_rgba(103,232,249,0.42)] sm:h-10 sm:w-10"
                            />
                            <span className="bg-gradient-to-r from-cyan-200 via-teal-300 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(103,232,249,0.30)]">
                                LuminX
                            </span>
                        </Link>
                    </span>
                    <div className="absolute left-1/2 top-1/2 hidden md:block -translate-x-1/2 -translate-y-1/2">
                        <span
                            style={{ fontFamily: 'var(--font-heading)' }}
                            className={`${className ? className : "text-neutral-400"} font-bold tracking-widest text-base lg:text-xl`}
                        >
                            {page}
                        </span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                        <div className="flex max-w-[64vw] items-center gap-1.5 overflow-x-auto whitespace-nowrap pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:max-w-[68vw] sm:gap-2">
                            {children}
                        </div>
                        {showHomeShortcut && (
                            <Link
                                to={homePath}
                                className="pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-50/6 p-1.5 text-cyan-50 border border-cyan-200/18 transition-all duration-200 hover:bg-cyan-50/10 hover:border-cyan-200/36"
                                aria-label="Home"
                                title="Home"
                            >
                                <House size={16} />
                            </Link>
                        )}
                        {isAuthenticated && (
                            <Link
                                to={userType === 'business' ? '/business/profile' : '/profile'}
                                className="pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-cyan-200/18 bg-cyan-50/6 text-cyan-50 transition-all duration-200 hover:border-cyan-200/36 hover:bg-cyan-50/10"
                                aria-label="Open profile settings"
                                title="Profile settings"
                            >
                                {profileImageSrc ? (
                                    <img
                                        src={profileImageSrc}
                                        alt={`${username} profile`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <UserRound size={16} />
                                )}
                            </Link>
                        )}
                    </div>
                </nav>
            </motion.div>
        </div>
    );
}

export default Navbar;
