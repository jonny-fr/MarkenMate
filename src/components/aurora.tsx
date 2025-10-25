'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import './aurora.css';

interface AuroraBackgroundProps {
  children: ReactNode;
  className?: string;
}

export const AuroraBackground = React.forwardRef<
  HTMLDivElement,
  AuroraBackgroundProps
>(({ children, className = '' }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const aurora1Ref = useRef<HTMLDivElement>(null);
  const aurora2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.0005;

      // Aurora 1 - Violett (Primary)
      if (aurora1Ref.current) {
        const x1 = Math.sin(time * 0.5) * 50;
        const y1 = Math.cos(time * 0.3) * 50;
        const scale1 = 1 + Math.sin(time * 0.2) * 0.2;
        aurora1Ref.current.style.transform = `translate(${x1}px, ${y1}px) scale(${scale1})`;
      }

      // Aurora 2 - Blau (Secondary)
      if (aurora2Ref.current) {
        const x2 = Math.cos(time * 0.4) * 60;
        const y2 = Math.sin(time * 0.25) * 60;
        const scale2 = 1 + Math.cos(time * 0.15) * 0.25;
        aurora2Ref.current.style.transform = `translate(${x2}px, ${y2}px) scale(${scale2})`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`aurora-background ${className}`}
    >
      <div className="aurora-container" ref={containerRef}>
        <div
          className="aurora aurora-1"
          ref={aurora1Ref}
        />
        <div
          className="aurora aurora-2"
          ref={aurora2Ref}
        />
      </div>
      <div className="aurora-overlay" />
      <div className="aurora-content">{children}</div>
    </div>
  );
});

AuroraBackground.displayName = 'AuroraBackground';

