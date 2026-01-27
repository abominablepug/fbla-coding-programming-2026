import React from 'react';
import {motion, useScroll, useTransform} from "framer-motion";

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
	const width = useTransform(scrollY, [0, 100], ["100%", "98%"]);
	const borderRadius = useTransform(scrollY, [0, 100], ["0px", "40px"]);
	const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
	const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);

    return (
        <div className="fixed z-50 w-full top-0 pointer-events-none flex justify-center">
            <motion.div style={{ width, borderRadius, marginTop, backgroundColor: bgColor }} className="px-8 flex items-center justify-between shadow-neutral-700 backdrop-blur-md pointer-events-auto shadow-md">
                <nav className="py-5 px-5 w-full flex items-center relative">
                    <span className="bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent font-bold tracking-widest text-lg md:text-xl">
                        BizMatch
                    </span>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className={`${className ? className : "text-neutral-400"} font-bold tracking-widest text-md md:text-xl`}>
                            {page}
                        </span>
                    </div>
                    <div className="flex space-x-2 ml-auto">
                        {children}
                    </div>
                </nav>
            </motion.div>
        </div>
    );
}

export default Navbar;
