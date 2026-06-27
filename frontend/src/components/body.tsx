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

            <AdBanner />
            {children}
        </div>
    );
}

export default Body;
