import React from 'react';

interface CardProps {
    title?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    cardClassName?: string;
    titleClassName?: string;
    contentClassName?: string;
    image?: string;
    imageHeight?: string;
    bgcolor?: string;
    color?: string;
}


const Card: React.FC<CardProps> = ({ 
    title, 
    children, 
    className = "", 
    cardClassName = "", 
    titleClassName = "", 
    contentClassName = "", 
    image = "",
    imageHeight = "200px",
    bgcolor = "",
}) => {
    const hasBodyContent = React.Children.count(children) > 0;

    return (
        <div className={`relative z-10 flex justify-center w-full ${className}`}>
            <div style={{backgroundColor:bgcolor}} className={`bg-neutral-950/72 light:bg-white/76 rounded-3xl border border-cyan-200/14 light:border-cyan-900/18 backdrop-blur-md shadow-[0_18px_58px_rgba(0,0,0,0.28)] light:shadow-[0_18px_48px_rgba(15,23,42,0.12)] ring-1 ring-neutral-50/5 light:ring-cyan-950/5 transition-all duration-300 hover:border-cyan-200/25 light:hover:border-cyan-900/25 overflow-hidden flex flex-col ${cardClassName}`}>
                {image && (
                    <div style={{ height: imageHeight }} className="w-full overflow-hidden flex-shrink-0">
                        <img src={image} alt={typeof title === 'string' ? title : 'Card image'} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="p-4 sm:p-6 md:p-8 flex-1 flex flex-col">
                    {title && (
                        <div className={`${hasBodyContent ? 'mb-6' : 'mb-0'} border-b border-white/10 pb-4`}>
                            {typeof title === 'string' ? (
                                <h1
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                    className={`text-2xl md:text-3xl font-bold text-cyan-300 light:text-cyan-900 line-clamp-2 ${titleClassName}`}
                                >
                                    {title}
                                </h1>
                            ) : (
                                <div className={titleClassName}>
                                    {title}
                                </div>
                            )}
                        </div>
                    )}
                    {hasBodyContent && (
                        <div className={`text-neutral-300 text-base leading-relaxed flex-1 ${contentClassName}`}>
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Card;
