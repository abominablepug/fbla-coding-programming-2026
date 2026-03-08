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
                className={`${linkClassName} flex shrink-0 items-center gap-1.5 pointer-events-auto rounded-full bg-blue-400 px-2 py-0.5 text-[10px] text-white shadow-lg transition-all duration-200 hover:bg-sky-400 sm:px-2.5 sm:py-1 sm:text-[11px] lg:hover:scale-[1.04]`}
            >
                        {title ? (
                            typeof title === 'string' ? (
                            <span style={{ fontFamily: 'var(--font-heading)' }} className={`text-sm font-normal text-white ${titleClassName}`}>
                                {title}
                            </span>
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
