'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { LoadingOverlay } from '@/components/ui/Spinner';

export interface GameBoardProps {
  /** Width of the game board in pixels */
  width?: number;
  /** Height of the game board in pixels */
  height?: number;
  /** Reference to expose canvas methods */
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  /** Whether the game is loading */
  loading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Whether to show FPS counter */
  showFps?: boolean;
  /** Current FPS value */
  fps?: number;
  /** Whether to enable CRT effect */
  crtEffect?: boolean;
  /** Whether to enable scanlines */
  scanlines?: boolean;
  /** Callback when canvas is ready */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Wrapper component for PixiJS game canvas
 */
export function GameBoard({
  width = 480,
  height = 416,
  canvasRef: externalRef,
  loading = false,
  loadingText = 'LOADING GAME...',
  showFps = false,
  fps,
  crtEffect = false,
  scanlines = true,
  onCanvasReady,
  className,
}: GameBoardProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = externalRef || internalRef;
  const [scale, setScale] = useState(1);

  // Handle responsive scaling
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) {
        return;
      }

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // Calculate scale to fit container while maintaining aspect ratio
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const newScale = Math.min(scaleX, scaleY, 2); // Max 2x scale

      setScale(Math.floor(newScale * 4) / 4); // Snap to quarter pixels
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);

  // Notify when canvas is ready
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [canvasRef, onCanvasReady]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center',
        'bg-retro-dark',
        'overflow-hidden',
        className
      )}
    >
      {/* Game canvas container */}
      <div
        className={cn(
          'relative',
          // Pixel-art frame border
          'border-4 border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
          'shadow-[6px_6px_0_0_rgba(0,0,0,0.6),inset_0_0_0_2px_rgba(0,0,0,0.3)]'
        )}
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        {/* Canvas element */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'block',
            // Pixel-perfect rendering
            '[image-rendering:pixelated]',
            '[image-rendering:crisp-edges]'
          )}
          style={{
            width: width * scale,
            height: height * scale,
          }}
        />

        {/* CRT effect overlay */}
        {crtEffect && (
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              // CRT curvature effect
              '[background:radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_90%,rgba(0,0,0,0.4)_100%)]'
            )}
          />
        )}

        {/* Scanlines overlay */}
        {scanlines && (
          <div
            className={cn(
              'absolute inset-0 pointer-events-none opacity-[0.03]',
              'bg-scanlines'
            )}
          />
        )}

        {/* Loading overlay */}
        <LoadingOverlay isLoading={loading} text={loadingText} />

        {/* FPS counter */}
        {showFps && fps !== undefined && (
          <div
            className={cn(
              'absolute top-1 right-1',
              'px-1 py-0.5',
              'bg-black/60',
              'font-pixel text-[8px]',
              fps >= 55 ? 'text-bomber-green' : fps >= 30 ? 'text-bomber-yellow' : 'text-bomber-red'
            )}
          >
            {fps} FPS
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-2 h-2 bg-game-wall/30" />
      <div className="absolute top-2 right-2 w-2 h-2 bg-game-wall/30" />
      <div className="absolute bottom-2 left-2 w-2 h-2 bg-game-wall/30" />
      <div className="absolute bottom-2 right-2 w-2 h-2 bg-game-wall/30" />
    </div>
  );
}

export interface GameOverlayProps {
  /** Overlay children */
  children: React.ReactNode;
  /** Whether to show backdrop */
  backdrop?: boolean;
  /** Position of the overlay */
  position?: 'center' | 'top' | 'bottom';
  /** Additional class names */
  className?: string;
}

/**
 * Overlay component for game HUD elements
 */
export function GameOverlay({
  children,
  backdrop = false,
  position = 'center',
  className,
}: GameOverlayProps) {
  const positionStyles = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-4',
    bottom: 'items-end justify-center pb-4',
  };

  return (
    <div
      className={cn(
        'absolute inset-0 flex',
        positionStyles[position],
        backdrop && 'bg-black/60 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
