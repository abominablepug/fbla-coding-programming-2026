import React from "react";

interface BodyProps {
  children?: React.ReactNode;
  className?: string;
}

const Body: React.FC<BodyProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`min-h-screen relative w-full overscroll-none ${className}`}
    >
      {/* Background layer */}
      <div
        className={
          "min-h-screen w-full fixed overflow-hidden " +
          "bg-[linear-gradient(135deg,#030712_0%,#07111f_40%,#101827_72%,#17152b_100%)] " +
          "dark:bg-[linear-gradient(135deg,#030712_0%,#07111f_40%,#101827_72%,#17152b_100%)] " +
          "light:bg-[linear-gradient(135deg,#b9d5e3_0%,#a2c7dc_42%,#b4c9de_72%,#cbd2e8_100%)]"
        }
      >
        {/* Overlay gradients - Increased light mode opacity to 55% for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(103,232,249,0.07)_32%,transparent_48%,rgba(139,92,246,0.07)_72%,transparent_100%)] dark:opacity-80 light:opacity-55" />
        
        {/* Top Glow */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-300/10 to-transparent light:from-cyan-600/25" />
        
        {/* Bottom Shading - Replaced white fade with a subtle dark tint to retain color contrast */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/55 to-transparent light:from-slate-500/15" />
      </div>

      {/* Content layer (must be above fixed background) */}
      <div className="relative z-10">{children}</div>

    </div>
  );
};

export default Body;