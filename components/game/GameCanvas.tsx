'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils/cn';
import { GameBoard } from './GameBoard';
import type { GameState } from '@/types/game';
import type { BombermanGame, LocalGameState } from '@/game/engine';

// ============================================================================
// Types
// ============================================================================

export interface GameCanvasProps {
  /** Room code for multiplayer connection */
  roomCode?: string;
  /** User's Clerk ID for authentication */
  clerkId?: string;
  /** Authentication token */
  authToken?: string;
  /** WebSocket server URL */
  serverUrl?: string;
  /** Width of the game canvas */
  width?: number;
  /** Height of the game canvas */
  height?: number;
  /** Whether to show FPS counter */
  showFps?: boolean;
  /** Whether to show debug overlay */
  debugMode?: boolean;
  /** Enable CRT visual effect */
  crtEffect?: boolean;
  /** Enable scanlines effect */
  scanlines?: boolean;
  /** Enable touch controls on mobile */
  touchControls?: boolean;
  /** Callback when game state changes */
  onGameStateChange?: (state: GameState) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when game ends */
  onGameEnd?: (winner: string | null) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Additional class names */
  className?: string;
}

export interface GameCanvasRef {
  /** Start/restart the game */
  start: () => Promise<void>;
  /** Pause the game */
  pause: () => void;
  /** Resume the game */
  resume: () => void;
  /** Stop and cleanup the game */
  stop: () => void;
  /** Get current local game state (client-side state) */
  getState: () => LocalGameState | null;
  /** Get FPS */
  getFps: () => number;
  /** Toggle debug mode */
  toggleDebug: () => void;
  /** Trigger camera shake */
  shake: (intensity: number, duration: number) => void;
  /** Check if game is running */
  isRunning: () => boolean;
}

type LoadingPhase = 'initializing' | 'loading' | 'connecting' | 'ready' | 'error';

// ============================================================================
// Game Canvas Component
// ============================================================================

/**
 * Main game canvas component that integrates PixiJS with React
 * Handles game initialization, rendering, and network communication
 */
export const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(
  function GameCanvas(
    {
      roomCode,
      clerkId,
      authToken,
      serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
      width = 480,
      height = 416,
      showFps = false,
      debugMode: _debugMode = false,
      crtEffect = false,
      scanlines = true,
      touchControls: _touchControls = false,
      onGameStateChange,
      onConnectionChange,
      onGameEnd: _onGameEnd,
      onError,
      className,
    },
    ref
  ) {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<BombermanGame | null>(null);
    const mountedRef = useRef(true);

    // State
    const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('initializing');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing...');
    const [fps, _setFps] = useState(60);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [_gameState, setGameState] = useState<LocalGameState | null>(null);

    // ==========================================================================
    // Server Message Handler
    // ==========================================================================
    // Note: The BombermanGame class already handles server messages internally
    // via the GameClient. No need to manually process them here.

    // ==========================================================================
    // Game Initialization
    // ==========================================================================

    const initializeGame = useCallback(async () => {
      if (!canvasRef.current || !mountedRef.current) {
        return;
      }

      try {
        setLoadingPhase('loading');
        setLoadingText('Loading game engine...');

        // Dynamically import game modules (SSR safety)
        const { BombermanGame } = await import('@/game/engine');

        if (!mountedRef.current) {
          return;
        }

        // Create game instance
        const game = new BombermanGame({
          baseWidth: width,
          baseHeight: height,
        });

        gameRef.current = game;

        // Initialize game (loads assets and sets up rendering)
        setLoadingText('Loading assets...');
        await game.init({
          container: canvasRef.current.parentElement!,
          width,
          height,
          onStateChange: (state) => {
            if (mountedRef.current) {
              setGameState(state);
              // onGameStateChange expects GameState, but we receive LocalGameState
              // We'd need to get the server state separately
              const serverState = game.getServerState();
              if (serverState) {
                onGameStateChange?.(serverState);
              }
            }
          },
          onLoadProgress: (progress) => {
            if (mountedRef.current) {
              setLoadingProgress(progress);
            }
          },
        });

        if (!mountedRef.current) {
          return;
        }

        // Set up network client if room code provided
        if (roomCode && clerkId) {
          setLoadingPhase('connecting');
          setLoadingText('Connecting to server...');

          // Connect to server and join room
          game.connectToServer(serverUrl, authToken);
          game.joinRoom(roomCode, clerkId);

          // Wait for connection with timeout
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 10000);

            const checkConnection = () => {
              const state = game.getState();
              if (state.connectionState === 'connected') {
                clearTimeout(timeout);
                setIsConnected(true);
                onConnectionChange?.(true);
                resolve();
              } else if (state.connectionState === 'error') {
                clearTimeout(timeout);
                reject(new Error('Connection failed'));
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });
        }

        if (!mountedRef.current) {
          return;
        }

        setLoadingPhase('ready');
        setLoadingText('');

        // TODO: Enable touch controls if requested (not yet implemented in BombermanGame)
        // if (touchControls) {
        //   game.enableTouchControls();
        // }

        // TODO: Set debug mode (not yet implemented in BombermanGame)
        // if (debugMode) {
        //   game.setDebugMode(true);
        // }

        // TODO: Start the game loop (not yet implemented in BombermanGame)
        // game.start();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize game');
        console.error('Game initialization error:', error);

        if (mountedRef.current) {
          setError(error);
          setLoadingPhase('error');
          setLoadingText(error.message);
          onError?.(error);
        }
      }
    }, [
      width,
      height,
      roomCode,
      clerkId,
      authToken,
      serverUrl,
      onGameStateChange,
      onConnectionChange,
      onError,
    ]);

    // ==========================================================================
    // Lifecycle
    // ==========================================================================

    useEffect(() => {
      mountedRef.current = true;
      initializeGame();

      return () => {
        mountedRef.current = false;

        // Cleanup game (this also cleans up the internal network client)
        if (gameRef.current) {
          gameRef.current.destroy();
          gameRef.current = null;
        }
      };
    }, [initializeGame]);

    // ==========================================================================
    // Ref Methods
    // ==========================================================================

    useImperativeHandle(
      ref,
      () => ({
        start: async () => {
          // TODO: Implement start method in BombermanGame
          console.warn('BombermanGame.start() not yet implemented');
        },
        pause: () => {
          // TODO: Implement pause method in BombermanGame
          console.warn('BombermanGame.pause() not yet implemented');
        },
        resume: () => {
          // TODO: Implement resume method in BombermanGame
          console.warn('BombermanGame.resume() not yet implemented');
        },
        stop: () => {
          // TODO: Implement stop method in BombermanGame
          console.warn('BombermanGame.stop() not yet implemented');
        },
        getState: () => {
          return gameRef.current?.getState() ?? null;
        },
        getFps: () => fps,
        toggleDebug: () => {
          // TODO: Implement debug mode in BombermanGame
          console.warn('BombermanGame debug mode not yet implemented');
        },
        shake: (intensity: number, duration: number) => {
          gameRef.current?.screenShake(intensity, duration);
        },
        isRunning: () => {
          // TODO: Implement isRunning method in BombermanGame
          // For now, return true if game ref exists and is not destroyed
          return gameRef.current !== null;
        },
      }),
      [fps]
    );

    // ==========================================================================
    // Render
    // ==========================================================================

    const isLoading = loadingPhase !== 'ready' && loadingPhase !== 'error';

    return (
      <div className={cn('relative', className)}>
        <GameBoard
          width={width}
          height={height}
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          loading={isLoading}
          loadingText={isLoading ? `${loadingText} ${Math.round(loadingProgress * 100)}%` : ''}
          showFps={showFps && !isLoading}
          fps={fps}
          crtEffect={crtEffect}
          scanlines={scanlines}
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <p className="font-pixel text-bomber-red text-sm mb-4">ERROR</p>
              <p className="font-pixel text-white text-xs mb-4">{error.message}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoadingPhase('initializing');
                  initializeGame();
                }}
                className="font-pixel text-xs px-4 py-2 bg-bomber-orange text-white hover:bg-bomber-yellow transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* Connection status indicator */}
        {roomCode && !isLoading && (
          <div
            className={cn(
              'absolute top-1 left-1 px-2 py-1',
              'font-pixel text-[8px]',
              'bg-black/60',
              isConnected ? 'text-bomber-green' : 'text-bomber-red'
            )}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
        )}

        {/* Touch controls overlay (rendered by game engine) */}
        {_touchControls && !isLoading && (
          <div
            id="touch-controls-container"
            className="absolute inset-0 pointer-events-none"
          />
        )}
      </div>
    );
  }
);

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to detect if device supports touch
 */
export function useTouchSupport(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is IE-specific
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('touchstart', () => setIsTouch(true), { once: true });
  }, []);

  return isTouch;
}

/**
 * Hook for game visibility handling (pause when tab hidden)
 */
export function useGameVisibility(
  gameRef: React.RefObject<GameCanvasRef | null>
): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);

      if (gameRef.current) {
        if (visible) {
          gameRef.current.resume();
        } else {
          gameRef.current.pause();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameRef]);

  return isVisible;
}

export default GameCanvas;
