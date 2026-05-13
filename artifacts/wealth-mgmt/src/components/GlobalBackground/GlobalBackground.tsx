import React, { useRef } from 'react';
import { useThreeScene } from './useThreeScene';

export const GlobalBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  useThreeScene(containerRef);

  return (
    <div
      ref={containerRef}
      id="global-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: '#09090B', // Fallback
      }}
    />
  );
};
