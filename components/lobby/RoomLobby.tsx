'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PlayerSlotGrid } from './PlayerSlot';
import { ColorPicker } from './ColorPicker';
import { MapPreviewBadge, MapSelector } from './MapSelector';
import { RoomSettingsPanel, RoomSettingsDisplay } from './RoomSettings';
import { useRoom } from '@/lib/hooks/useRoom';
import { useLobby } from '@/lib/hooks/useLobby';
import type { GameMap } from '@/types/game';

export interface RoomLobbyProps {
  /** Available maps for selection */
  maps?: GameMap[];
  /** Additional class names */
  className?: string;
}

/**
 * Complete room lobby component
 * Shows player slots, settings, and controls for pre-game
 */
export function RoomLobby({ maps = [], className }: RoomLobbyProps) {
  const [_showColorPicker, _setShowColorPicker] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    currentRoom,
    isHost,
    currentPlayer,
    currentPlayerId,
    players,
    settings,
    canStartGame,
    allPlayersReady,
  } = useRoom();

  const {
    isConnected,
    toggleReady,
    changeColor,
    selectMap,
    updateSettings,
    startGame,
    leaveRoom,
    kickPlayer,
  } = useLobby();

  if (!currentRoom) {
    return (
      <div className={cn('flex items-center justify-center py-20', className)}>
        <Card padding="lg">
          <p className="font-pixel text-sm text-gray-500">Not in a room</p>
        </Card>
      </div>
    );
  }

  const handleToggleReady = () => {
    if (currentPlayer) {
      toggleReady(!currentPlayer.isReady);
    }
  };

  const handleStartGame = () => {
    if (canStartGame) {
      startGame();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card variant="elevated">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="font-pixel text-2xl text-white uppercase">
                Room {currentRoom.roomCode}
              </h2>
              {currentRoom.settings.isPrivate && (
                <Badge variant="warning" size="lg">
                  Private
                </Badge>
              )}
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-bomber-green animate-pulse' : 'bg-bomber-red'
                )}
              />
              <span className="font-pixel text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm font-retro text-gray-400">
              <span>
                {players.length}/{settings?.maxPlayers || 0} Players
              </span>
              {allPlayersReady && players.length >= 2 && (
                <Badge variant="success" size="sm" glow>
                  All Ready
                </Badge>
              )}
            </div>

            <Button variant="secondary" size="sm" onClick={leaveRoom}>
              Leave Room
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main content - Player slots */}
        <div className="lg:col-span-2 space-y-4">
          {/* Player slots */}
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerSlotGrid
                players={players}
                maxPlayers={settings?.maxPlayers || 4}
                currentPlayerId={currentPlayerId || undefined}
                _hostId={currentRoom.hostId}
                onKick={isHost ? kickPlayer : undefined}
              />
            </CardContent>
          </Card>

          {/* Player controls */}
          <Card>
            <CardHeader>
              <CardTitle>Your Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Color selection */}
              <div>
                <label className="font-pixel text-xs text-gray-400 uppercase block mb-2">
                  Your Color
                </label>
                <div className="flex items-center gap-3">
                  {currentPlayer && (
                    <ColorPicker
                      selectedColor={currentPlayer.color}
                      onColorSelect={changeColor}
                      unavailableColors={players
                        .filter((p) => p.id !== currentPlayerId)
                        .map((p) => p.color)}
                      mode="row"
                      size="lg"
                    />
                  )}
                </div>
              </div>

              {/* Ready button */}
              <div>
                <Button
                  variant={currentPlayer?.isReady ? 'success' : 'primary'}
                  size="lg"
                  onClick={handleToggleReady}
                  fullWidth
                  className={currentPlayer?.isReady ? 'animate-pulse' : ''}
                >
                  {currentPlayer?.isReady ? 'Ready!' : 'Mark as Ready'}
                </Button>
                <p className="mt-2 font-retro text-xs text-gray-500 text-center">
                  {currentPlayer?.isReady
                    ? 'Waiting for other players...'
                    : 'Click when you are ready to play'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Host controls */}
          {isHost && (
            <Card variant="glow">
              <CardHeader>
                <CardTitle>Host Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={!canStartGame}
                  fullWidth
                  className={canStartGame ? 'animate-pulse' : ''}
                >
                  {canStartGame
                    ? 'Start Game'
                    : `Waiting for players (${players.filter((p) => p.isReady).length}/${players.length} ready)`}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    fullWidth
                  >
                    Settings
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMapSelector(true)}
                    fullWidth
                  >
                    Change Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Map and settings info */}
        <div className="space-y-4">
          {/* Selected map */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Map</CardTitle>
            </CardHeader>
            <CardContent>
              <MapPreviewBadge
                map={
                  currentRoom.map
                    ? (maps.find((m) => m.id === currentRoom.map?.id) ?? null)
                    : null
                }
                onChangeClick={isHost ? () => setShowMapSelector(true) : undefined}
                showChangeButton={isHost}
              />
            </CardContent>
          </Card>

          {/* Game settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Game Settings</CardTitle>
                {isHost && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="font-pixel text-[10px] text-bomber-blue hover:text-bomber-cyan uppercase"
                  >
                    Edit
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {settings && <RoomSettingsDisplay settings={settings} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}

      {/* Map selector modal */}
      {showMapSelector && isHost && (
        <Modal
          isOpen={showMapSelector}
          onClose={() => setShowMapSelector(false)}
          title="Select Map"
        >
          <MapSelector
            maps={maps}
            selectedMapId={currentRoom.map?.id || null}
            onSelectMap={(mapId) => {
              selectMap(mapId);
              setShowMapSelector(false);
            }}
          />
        </Modal>
      )}

      {/* Settings modal */}
      {showSettings && isHost && settings && (
        <Modal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Room Settings"
          size="lg"
        >
          <RoomSettingsPanel
            settings={settings}
            onUpdate={(updates) => {
              updateSettings(updates);
              setShowSettings(false);
            }}
            canEdit={isHost}
          />
        </Modal>
      )}
    </div>
  );
}

/**
 * Compact room lobby header for in-game display
 */
export interface RoomLobbyHeaderProps {
  className?: string;
}

export function RoomLobbyHeader({ className }: RoomLobbyHeaderProps) {
  const { currentRoom, isHost, players, canStartGame } = useRoom();
  const { startGame } = useLobby();

  if (!currentRoom) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        'bg-retro-darker/90 backdrop-blur-sm',
        'border-b-2 border-game-wall/50',
        'px-6 py-3',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <span className="font-pixel text-sm text-bomber-yellow uppercase">
          Room {currentRoom.roomCode}
        </span>
        <span className="font-retro text-xs text-gray-500">
          {players.length}/{currentRoom.settings.maxPlayers} Players
        </span>
      </div>

      {isHost && (
        <Button
          variant="success"
          size="sm"
          onClick={startGame}
          disabled={!canStartGame}
          className={canStartGame ? 'animate-pulse' : ''}
        >
          {canStartGame ? 'Start Game' : 'Waiting...'}
        </Button>
      )}
    </div>
  );
}
