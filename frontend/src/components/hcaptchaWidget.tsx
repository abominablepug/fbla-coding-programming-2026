import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    hcaptcha?: any;
    __hcaptchaOnLoad?: () => void;
  }
}

interface HCaptchaWidgetProps {
  siteKey?: string;
  onVerifyToken: (token: string | null) => void;
  className?: string;
}

// Lazy-load and mount hCaptcha widget, returning token changes upward.
const HCaptchaWidget = ({ siteKey, onVerifyToken, className = '' }: HCaptchaWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [ready, setReady] = useState(false);

  // Inject provider script once, then mark widget ready for render.
  useEffect(() => {
    if (!siteKey) {
      onVerifyToken(null);
      return;
    }

    const existingScript = document.getElementById('hcaptcha-script') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.hcaptcha) setReady(true);
      return;
    }

    window.__hcaptchaOnLoad = () => setReady(true);
    const script = document.createElement('script');
    script.id = 'hcaptcha-script';
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=__hcaptchaOnLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [siteKey, onVerifyToken]);

  // Render explicit widget instance and clean up on unmount.
  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.hcaptcha) return;
    if (widgetIdRef.current !== null) return;

    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token: string) => onVerifyToken(token || null),
      'expired-callback': () => onVerifyToken(null),
      'error-callback': () => onVerifyToken(null),
    });

    return () => {
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // noop
        }
      }
      widgetIdRef.current = null;
      onVerifyToken(null);
    };
  }, [ready, siteKey, onVerifyToken]);

  if (!siteKey) {
    return (
      <div className={`rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200 ${className}`}>
        Missing hCaptcha site key. Add `VITE_HCAPTCHA_SITE_KEY` (or `PUBLIC_HCAPTCHA_SITE_KEY`) to frontend env.
      </div>
    );
  }

  return <div className={className}><div ref={containerRef} /></div>;
};

export default HCaptchaWidget;
