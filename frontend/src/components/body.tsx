import React from 'react';
import { motion } from "framer-motion";

interface BodyProps {
    children?: React.ReactNode;
    className?: string;
}


const Body: React.FC<BodyProps> = ({ 
    children,
    className= ""
}) => {
    return (
        <div className={`min-h-screen bg-neutral-900 relative w-full overscroll-none ${className}`}>
			<div className=" min-h-screen w-full fixed bg-neutral-900 backdrop-blur-[400px] flex items-center justify-center overflow-hidden">
				<motion.div initial={{ opacity: 0.4, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
					<div className="absolute bottom-[-500px] w-full h-full bg-linear-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
				</motion.div>
				<motion.div initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
					<div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-linear-to-b from-cyan-700/40 via-cyan-500/40 to-purple-400/40 blur-[120px] rounded-full" />
				</motion.div>
			</div>
            {children}
        </div>
    );
}

export default Body;
