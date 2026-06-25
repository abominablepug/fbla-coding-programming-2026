import React from "react";

interface BodyProps {
  children?: React.ReactNode;
  className?: string;
}

// Shared page shell rendering an ambient animated background behind content.
// It switches automatically between dark/light based on `html[data-theme]`.
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
          "light:bg-[linear-gradient(135deg,#d7eaf3_0%,#c8e0ec_42%,#dbe6f1_72%,#e1d9ed_100%)] "
        }
      >
        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(103,232,249,0.07)_32%,transparent_48%,rgba(139,92,246,0.07)_72%,transparent_100%)] dark:opacity-80 light:opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-25 light:opacity-35" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-300/10 to-transparent light:from-cyan-700/10" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/55 to-transparent light:from-white/60" />
      </div>

      {children}
    </div>
  );
};

export default Body;
