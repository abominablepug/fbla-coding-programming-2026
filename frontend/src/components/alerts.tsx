import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';

type AlertPayload = {
  message: string;
  icon?: React.ReactNode;
  textColor?: string;
  bgColor?: string;
  width?: string;
  height?: string;
  duration?: number;
  persistent?: boolean;
};

type AlertItem = AlertPayload & {
  id: string;
};

const MAX_VISIBLE = 3;
const listeners = new Set<(payload: AlertPayload) => void>();

export const enqueueAlert = (payload: AlertPayload) => {
  listeners.forEach((listener) => listener(payload));
};

const Alerts = () => {
  const [visible, setVisible] = useState<AlertItem[]>([]);
  const queueRef = useRef<AlertItem[]>([]);
  const timerMapRef = useRef<Map<string, number>>(new Map());

  const promoteFromQueue = useCallback(() => {
    setVisible((prev) => {
      if (prev.length >= MAX_VISIBLE || queueRef.current.length === 0) return prev;
      const next = queueRef.current.shift();
      if (!next) return prev;
      return [...prev, next];
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timerMapRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timerMapRef.current.delete(id);
    }
    setVisible((prev) => prev.filter((item) => item.id !== id));
    window.setTimeout(promoteFromQueue, 0);
  }, [promoteFromQueue]);

  useEffect(() => {
    const onEnqueue = (payload: AlertPayload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: AlertItem = {
        id,
        duration: 2500,
        textColor: 'text-white',
        // Darker overlay in light mode so it doesn't look too washed out
        bgColor: 'bg-neutral-800/85',
        width: 'w-80',
        height: 'h-auto',
        persistent: false,
        ...payload,
      };

      setVisible((prev) => {
        if (prev.length < MAX_VISIBLE) {
          return [...prev, item];
        }
        queueRef.current.push(item);
        return prev;
      });
    };

    listeners.add(onEnqueue);
    return () => {
      listeners.delete(onEnqueue);
    };
  }, []);

  useEffect(() => {
    visible.forEach((item) => {
      if (item.persistent || !item.duration || item.duration <= 0) return;
      if (timerMapRef.current.has(item.id)) return;
      const timer = window.setTimeout(() => dismiss(item.id), item.duration);
      timerMapRef.current.set(item.id, timer);
    });
  }, [visible, dismiss]);

  useEffect(() => {
    return () => {
      timerMapRef.current.forEach((timer) => window.clearTimeout(timer));
      timerMapRef.current.clear();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {visible.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 120 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 120 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className={`
              pointer-events-auto
              backdrop-blur-md
              border border-neutral-700
              shadow-2xl
              rounded-xl
              flex items-center gap-3 p-4
              ${item.bgColor}
              ${item.textColor === 'text-green-300' ? 'text-green-500' : item.textColor}
              ${item.width}
              ${item.height}
            `}
          >
            <div className="shrink-0">{item.icon ?? <Info className="w-5 h-5" />}</div>
            <p className="flex-1 text-sm">{item.message}</p>
            <button
              onClick={() => dismiss(item.id)}
              className="opacity-70 hover:opacity-100 transition"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Alerts;
