import React from 'react';

interface CardProps {
    title?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    cardClassName?: string;
    titleClassName?: string;
    contentClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = "", cardClassName = "", titleClassName = "", contentClassName = "" }) => {
    return (
        <div  style={{"width":"100%",height:'100%',alignItems: 'center'}}className={`relative z-10 flex justify-center ${className}`}>
            <div style={{"width":"600px","height":"700px","backgroundColor": "rgba(26, 184, 247, 0.5)"}} className={`bg-neutral-800/60 p-8 md:p-12 rounded-3xl w-[80%] md:w-[70%] border border-white/5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/10${cardClassName}`}>
                {title && (
                    <div className="mb-8 border-b border-white/10 pb-4">
                        {typeof title === 'string' ? (
                            <h1 className={`text-3xl md:text-4xl font-bold text-[#FFFFFF] ${titleClassName}`}>
                                {title}
                            </h1>
                        ) : (
                            <div className={titleClassName}>
                                {title}
                            </div>
                        )}
                    </div>
                )}
                <div className={`text-neutral-400 min:text-lg leading-relaxed ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Card;
