import React, { useEffect, useMemo, useState } from 'react';
import {motion, useScroll, useTransform} from "framer-motion";
import { Link, useLocation } from 'react-router-dom';
import { House } from 'lucide-react';

interface NavBarProps {
    page?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    cardClassName?: string;
    titleClassName?: string;
    contentClassName?: string;
}

const Navbar: React.FC<NavBarProps> = ({ page, children, className = ""}) => {
    const { scrollY } = useScroll();
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
	const width = useTransform(scrollY, [0, 100], ["100%", "98%"]);
	const borderRadius = useTransform(scrollY, [0, 100], ["0px", "40px"]);
	const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
	const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);
    const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

    useEffect(() => {
        let cancelled = false;
        const checkAuth = async () => {
            try {
                const response = await fetch(`${authBaseUrl}/auth/dashboard`, { credentials: 'include' });
                if (!cancelled) {
                    setIsAuthenticated(response.ok);
                }
            } catch {
                if (!cancelled) {
                    setIsAuthenticated(false);
                }
            }
        };
        void checkAuth();
        return () => {
            cancelled = true;
        };
    }, [authBaseUrl, location.pathname]);

    const brandLink = useMemo(() => {
        const appPages = new Set(['/dashboard', '/map', '/tinder', '/discount', '/reviews']);
        if (appPages.has(location.pathname)) return '/dashboard';
        return isAuthenticated ? '/dashboard' : '/';
    }, [isAuthenticated, location.pathname]);
    const showHomeShortcut = isAuthenticated && !location.pathname.startsWith('/dashboard');

    return (
        <div className="fixed z-50 w-full top-0 pointer-events-none flex justify-center">
            <motion.div style={{ width, borderRadius, marginTop, backgroundColor: bgColor }} className="px-3 sm:px-5 flex items-center justify-between shadow-neutral-700 backdrop-blur-md pointer-events-auto shadow-md">
                <nav className="py-3 sm:py-4 px-1 sm:px-3 w-full flex items-center relative">
                    <span
                        style={{ fontFamily: 'var(--font-brand)' }}
                        className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent font-semibold tracking-widest text-base drop-shadow-[0_0_8px_rgba(56,189,248,0.42)] sm:text-lg md:text-xl"
                    >
                        <Link to={brandLink}>
                            LuminX
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
                        <div className="my-[-2px] flex max-w-[64vw] items-center gap-1.5 overflow-x-auto py-[2px] whitespace-nowrap pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:max-w-[68vw] sm:gap-2">
                            {children}
                        </div>
                        {showHomeShortcut && (
                            <Link
                                to="/dashboard"
                                className="pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-full bg-blue-400 p-1.5 text-white shadow-lg transition-all duration-200 hover:bg-sky-400"
                                aria-label="Home"
                                title="Home"
                            >
                                <House size={16} />
                            </Link>
                        )}
                    </div>
                </nav>
            </motion.div>
        </div>
    );
}

export default Navbar;
