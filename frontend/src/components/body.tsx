import React from 'react';

import AdBanner from './adBanner';

interface BodyProps {
    children?: React.ReactNode;
    className?: string;
}


const Body: React.FC<BodyProps> = ({ 
    children,
    className= ""
}) => {
    return (
		<div className={`min-h-screen ${className}`}>
			<div className="min-h-screen w-full fixed bg-[linear-gradient(135deg,#030712_0%,#07111f_40%,#101827_72%,#17152b_100%)] light:bg-[linear-gradient(135deg,#b9d5e3_0%,#a2c7dc_42%,#b4c9de_72%,#cbd2e8_100%)] flex items-center justify-center overflow-hidden -z-10">
				{/* Top Glow */}
				<div className="absolute inset-0 bg-gradient-to-b from-cyan-300/10 to-transparent light:from-cyan-600/25 pointer-events-none" />
				{/* Overlay Layer */}
				<div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(103,232,249,0.07)_32%,transparent_48%,rgba(139,92,246,0.07)_72%,transparent_100%)] opacity-80 light:opacity-55 pointer-events-none" />
				{/* Bottom Shading */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent light:from-slate-500/15 pointer-events-none" />
			</div>
            <AdBanner />
            {children}
        </div>
    );
}

export default Body;
