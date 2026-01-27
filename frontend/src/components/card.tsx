import React from 'react';

interface CardProps {
    title?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    cardClassName?: string;
    titleClassName?: string;
    contentClassName?: string;
    style?: string;
}


const Card: React.FC<CardProps> = ({ title, children, className = "", cardClassName = "", titleClassName = "", contentClassName = "", style=""}) => {
    return (
        <div className={`relative z-10 flex justify-center w-full ${className}`}>
            <div className={`bg-neutral-800/60 p-8 md:p-12 rounded-3xl w-[85%] md:w-[95%] border border-white/5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/10 ${cardClassName}`}>
                {title && (
                    <div className="mb-8 border-b border-white/10 pb-4">
                        {typeof title === 'string' ? (
                            <h1 className={`text-3xl md:text-4xl font-bold text-[#406386] ${titleClassName}`}>
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
