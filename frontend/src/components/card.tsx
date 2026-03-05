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
            <div style={{backgroundColor:bgcolor}} className={`bg-neutral-800/60 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/10 overflow-hidden flex flex-col ${cardClassName}`}>
                {image && (
                    <div style={{ height: imageHeight }} className="w-full overflow-hidden flex-shrink-0">
                        <img src={image} alt={typeof title === 'string' ? title : 'Card image'} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="p-8 md:p-12 flex-1 flex flex-col">
                    {title && (
                        <div className={`${hasBodyContent ? 'mb-6' : 'mb-0'} border-b border-white/10 pb-4`}>
                            {typeof title === 'string' ? (
                                <h1
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                    className={`text-3xl font-bold text-[#406386] line-clamp-2 ${titleClassName}`}
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
