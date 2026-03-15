'use client';

import { useEffect, useRef, useState } from 'react';

export default function PlayPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'connecting' | 'playing' | 'error'>('loading');

  useEffect(() => {
    // Placeholder for game initialization
    // This will be replaced with PixiJS game engine initialization
    setStatus('connecting');

    // Simulate connection
    const timer = setTimeout(() => {
      setStatus('playing');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-retro-darker p-4">
      {/* Game Container */}
      <div className="relative">
        {/* Game Canvas Container */}
        <div
          ref={canvasRef}
          className="game-board flex items-center justify-center bg-game-ground"
        >
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-pixel text-sm text-bomber-yellow loading-dots">LOADING</p>
            </div>
          )}

          {status === 'connecting' && (
            <div className="text-center">
              <p className="text-pixel text-sm text-bomber-blue loading-dots">CONNECTING</p>
            </div>
          )}

          {status === 'playing' && (
            <div className="text-center">
              <p className="text-pixel text-xs text-gray-500 mb-4">GAME CANVAS</p>
              <p className="text-retro text-gray-400">PixiJS game will render here</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-pixel text-sm text-bomber-red mb-4">CONNECTION ERROR</p>
              <button className="btn-retro-primary text-pixel text-xs px-4 py-2">
                RETRY
              </button>
            </div>
          )}
        </div>

        {/* Scanline Effect */}
        <div className="scanlines absolute inset-0 pointer-events-none" />
      </div>

      {/* Game Controls Info */}
      <div className="mt-8 card-retro p-4 text-center">
        <p className="text-pixel text-xs text-gray-500 mb-2">CONTROLS</p>
        <div className="flex gap-8 text-retro text-sm text-gray-400">
          <span>↑↓←→ Move</span>
          <span>SPACE Place Bomb</span>
        </div>
      </div>
    </main>
  );
}
