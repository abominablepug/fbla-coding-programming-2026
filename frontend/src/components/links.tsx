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

// Reusable styled navigation link wrapper with optional title and click handler.
const Links: React.FC<LinkProps> = ({ title, children, link = "", className = "", linkClassName = "", titleClassName = "", onClick}) => {
    return (
        <div className={`relative z-10 flex justify-center ${className}`}>
            <Link
                to={link.startsWith('/') ? link : `/${link}`}
                onClick={onClick}
                style={{ fontFamily: 'var(--font-link)' }}
                className={`${linkClassName} flex shrink-0 items-center gap-1.5 pointer-events-auto rounded-md border border-cyan-200/18 bg-cyan-50/6 px-2.5 py-1.5 text-[10px] text-cyan-50 shadow-md shadow-black/15 transition-all duration-200 hover:border-cyan-200/36 hover:bg-cyan-50/12 light:border-cyan-900/22 light:bg-white/58 light:text-slate-950 light:hover:bg-white/82 sm:px-3 sm:py-1.5 sm:text-[11px] lg:hover:translate-y-[-1px]`}
            >
                        {title ? (
                            typeof title === 'string' ? (
                            <span style={{ fontFamily: 'var(--font-heading)' }} className={`text-sm font-normal text-white light:text-slate-950 ${titleClassName}`}>
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
