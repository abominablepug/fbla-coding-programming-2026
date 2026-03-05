import {Link} from 'react-router-dom';
import React from 'react';

interface LinkProps {
    title?: React.ReactNode;
    children?: React.ReactNode;
    link?: string;
    className?: string;
    linkClassName?: string;
    titleClassName?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

const Links: React.FC<LinkProps> = ({ title, children, link = "", className = "", linkClassName = "", titleClassName = "", onClick}) => {
    return (
        <div className={`relative z-10 flex justify-center ${className}`}>
            <Link
                to={link.startsWith('/') ? link : `/${link}`}
                onClick={onClick}
                style={{ fontFamily: 'var(--font-link)' }}
                className={`${linkClassName} flex items-center gap-2 pointer-events-auto px-3 py-1 rounded-full bg-blue-400 text-orange-50 shadow-lg hover:bg-sky-400 transition-all duration-200 lg:hover:scale-[1.06] text-md`}
            >
                        {title ? (
                            typeof title === 'string' ? (
                            <h1 style={{ fontFamily: 'var(--font-heading)' }} className={`text-xl md:text-xl font-bold text-[#406386] ${titleClassName}`}>
                                {title}
                            </h1>
                        ) : (
                            <div className={titleClassName}>
                                {title}
                            </div>
                        )
                        ) : children}
            </Link>
        </div>
    );
}

export default Links;
