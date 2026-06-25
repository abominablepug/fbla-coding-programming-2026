import { useEffect, useMemo, useState } from 'react';

interface SliderCaptchaProps {
  onVerifyChange: (verified: boolean) => void;
  className?: string;
}

// Simple slider verification control used before sensitive form submissions.
const SliderCaptcha = ({ onVerifyChange, className = '' }: SliderCaptchaProps) => {
  const [value, setValue] = useState(0);
  const [verified, setVerified] = useState(false);

  // Report verification changes upward so parent forms can gate actions.
  useEffect(() => {
    onVerifyChange(verified);
  }, [verified, onVerifyChange]);

  // Keep progress value clamped to valid percentage range boundaries.
  const progress = useMemo(() => Math.min(100, Math.max(0, value)), [value]);

  // Update slider state and mark verified near completion threshold.
  const handleSlide = (nextValue: number) => {
    if (verified) return;
    const clamped = Math.max(0, Math.min(100, nextValue));
    setValue(clamped);
    if (clamped >= 97) {
      setValue(100);
      setVerified(true);
    }
  };

  // Reset slider and verification state for another manual attempt.
  const resetCaptcha = () => {
    setValue(0);
    setVerified(false);
  };

  return (
    <div className={`rounded-xl border border-white/15 bg-white/5 p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-cyan-200">
          {verified ? 'Verification complete' : 'Slide to verify'}
        </p>
        <button
          type="button"
          onClick={resetCaptcha}
          className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-gray-200 hover:bg-white/10"
        >
          Reset
        </button>
      </div>

      <div className="relative mb-2 h-2.5 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full transition-all ${verified ? 'bg-emerald-400' : 'bg-cyan-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => handleSlide(Number(e.target.value))}
        className="w-full accent-cyan-400 disabled:opacity-70"
        disabled={verified}
        aria-label="Slide captcha verification"
      />
    </div>
  );
};

export default SliderCaptcha;
