import React, { useEffect, useState, } from "react";
import { motion, AnimatePresence} from "framer-motion";
import { Info, X} from "lucide-react";

interface AlertsProps {
  message: string;
  icon?: React.ReactNode;
  textColor?: string;
  bgColor?: string;
  width?: string;
  height?: string;
  duration?: number; 
  persistent?: boolean;
  onClose: () => void;
}

const Alerts: React.FC<AlertsProps> = ({
  message,
  icon,
  textColor = "text-white",
  bgColor = "bg-neutral-900/80",
  width = "w-80",
  height = "h-auto",
  duration = 2000,
  persistent = false,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (persistent) return;
    if (duration <= 0) return;

    const timer = setTimeout(() => setIsExiting(true), duration);
    return () => clearTimeout(timer);
  }, [duration, persistent]);

 
  const handleClose = () => setIsExiting(true);

  useEffect(() => {
    if (!isExiting) return;

    const timer = setTimeout(() => {
      onClose(); 
    }, 250); 
    return () => clearTimeout(timer);
  }, [isExiting, onClose]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, x: 120 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 120 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={`
            fixed top-6 right-6 z-9999
            backdrop-blur-md
            border border-neutral-700
            shadow-2xl
            rounded-xl
            flex items-center gap-3 p-4
            ${bgColor}
            ${textColor}
            ${width}
            ${height}
          `}
        >
          <div className="shrink-0">
            {icon ?? <Info className="w-5 h-5" />}
          </div>

          <p className="flex-1 text-sm">{message}</p>

          <button
            onClick={handleClose}
            className="opacity-70 hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Alerts;