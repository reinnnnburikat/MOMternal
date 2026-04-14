'use client';

import { useState, useEffect } from 'react';

interface SplashScreenProps {
  /** Duration in ms before the splash starts fading out */
  duration?: number;
  /** Callback when splash animation completes */
  onComplete?: () => void;
}

export function SplashScreen({ duration = 2500, onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), duration);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration + 600); // fade-out transition duration

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-rose-950 transition-opacity duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Heartbeat logo */}
      <div className="animate-heartbeat">
        <img
          src="/loading-icon.png"
          alt="MOMternal"
          className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]"
          draggable={false}
        />
      </div>

      {/* MOMternal text — fades in after a delay */}
      <h1
        className={`mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white transition-all duration-700 ease-out ${
          fadeOut
            ? 'opacity-0 translate-y-2'
            : 'opacity-100 translate-y-0'
        }`}
        style={{ transitionDelay: '400ms' }}
      >
        MOMternal
      </h1>

      {/* Tagline */}
      <p
        className={`mt-1.5 text-xs sm:text-sm text-rose-300/70 tracking-wide transition-all duration-700 ease-out ${
          fadeOut
            ? 'opacity-0'
            : 'opacity-100'
        }`}
        style={{ transitionDelay: '700ms' }}
      >
        Mobilized Outreach Maternal Support
      </p>
    </div>
  );
}
