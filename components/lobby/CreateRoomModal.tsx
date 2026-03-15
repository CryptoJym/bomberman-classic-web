'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';

export interface RoomSettings {
  name: string;
  maxPlayers: number;
  mapId: string;
  gameMode: string;
  timeLimit: number;
  rounds: number;
  isPrivate: boolean;
  password?: string;
  isRanked: boolean;
  powerupsEnabled: boolean;
  suddenDeath: boolean;
}

export interface CreateRoomModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler */
  onSubmit: (settings: RoomSettings) => void;
  /** Loading state */
  loading?: boolean;
  /** Available maps */
  maps?: { id: string; name: string }[];
  /** Available game modes */
  gameModes?: { id: string; name: string }[];
  /** Default settings */
  defaultSettings?: Partial<RoomSettings>;
  /** Additional class names */
  className?: string;
}

const defaultMaps = [
  { id: 'classic', name: 'Classic Arena' },
  { id: 'maze', name: 'The Maze' },
  { id: 'open', name: 'Open Field' },
  { id: 'castle', name: 'Castle Ruins' },
  { id: 'factory', name: 'Factory' },
];

const defaultGameModes = [
  { id: 'battle', name: 'Battle Royale' },
  { id: 'team', name: 'Team Battle' },
  { id: 'capture', name: 'Capture the Flag' },
  { id: 'survival', name: 'Survival' },
];

/**
 * Modal for creating a new game room
 */
export function CreateRoomModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  maps = defaultMaps,
  gameModes = defaultGameModes,
  defaultSettings,
  className,
}: CreateRoomModalProps) {
  const [settings, setSettings] = useState<RoomSettings>({
    name: defaultSettings?.name || '',
    maxPlayers: defaultSettings?.maxPlayers || 4,
    mapId: defaultSettings?.mapId || maps[0]?.id || 'classic',
    gameMode: defaultSettings?.gameMode || gameModes[0]?.id || 'battle',
    timeLimit: defaultSettings?.timeLimit || 180,
    rounds: defaultSettings?.rounds || 3,
    isPrivate: defaultSettings?.isPrivate || false,
    password: defaultSettings?.password || '',
    isRanked: defaultSettings?.isRanked || false,
    powerupsEnabled: defaultSettings?.powerupsEnabled ?? true,
    suddenDeath: defaultSettings?.suddenDeath ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoomSettings, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RoomSettings, string>> = {};

    if (!settings.name.trim()) {
      newErrors.name = 'Room name is required';
    } else if (settings.name.length < 3) {
      newErrors.name = 'Room name must be at least 3 characters';
    } else if (settings.name.length > 20) {
      newErrors.name = 'Room name must be less than 20 characters';
    }

    if (settings.isPrivate && !settings.password?.trim()) {
      newErrors.password = 'Password is required for private rooms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(settings);
    }
  };

  const updateSetting = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CREATE ROOM"
      size="md"
      className={className}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            CANCEL
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'CREATING...' : 'CREATE'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Name */}
        <Input
          label="Room Name"
          placeholder="Enter room name..."
          value={settings.name}
          onChange={(e) => updateSetting('name', e.target.value)}
          error={errors.name}
          maxLength={20}
        />

        {/* Player & Map Settings */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Max Players"
            value={settings.maxPlayers.toString()}
            onChange={(value) => updateSetting('maxPlayers', parseInt(value))}
            options={[
              { value: '2', label: '2 Players' },
              { value: '3', label: '3 Players' },
              { value: '4', label: '4 Players' },
              { value: '6', label: '6 Players' },
              { value: '8', label: '8 Players' },
            ]}
          />

          <Select
            label="Map"
            value={settings.mapId}
            onChange={(value) => updateSetting('mapId', value)}
            options={maps.map((m) => ({ value: m.id, label: m.name }))}
          />
        </div>

        {/* Game Mode & Time */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Game Mode"
            value={settings.gameMode}
            onChange={(value) => updateSetting('gameMode', value)}
            options={gameModes.map((m) => ({ value: m.id, label: m.name }))}
          />

          <Select
            label="Time Limit"
            value={settings.timeLimit.toString()}
            onChange={(value) => updateSetting('timeLimit', parseInt(value))}
            options={[
              { value: '60', label: '1 Minute' },
              { value: '120', label: '2 Minutes' },
              { value: '180', label: '3 Minutes' },
              { value: '300', label: '5 Minutes' },
              { value: '0', label: 'No Limit' },
            ]}
          />
        </div>

        {/* Rounds */}
        <Select
          label="Rounds"
          value={settings.rounds.toString()}
          onChange={(value) => updateSetting('rounds', parseInt(value))}
          options={[
            { value: '1', label: '1 Round' },
            { value: '3', label: '3 Rounds' },
            { value: '5', label: '5 Rounds' },
            { value: '7', label: '7 Rounds' },
          ]}
        />

        {/* Divider */}
        <div className="border-t border-game-wall/30 my-4" />

        {/* Game Options */}
        <div className="space-y-3">
          <span className="font-pixel text-xs text-gray-400 uppercase">Game Options</span>

          <div className="grid grid-cols-2 gap-3">
            <Checkbox
              label="Powerups"
              checked={settings.powerupsEnabled}
              onChange={(e) => updateSetting('powerupsEnabled', e.target.checked)}
            />
            <Checkbox
              label="Sudden Death"
              checked={settings.suddenDeath}
              onChange={(e) => updateSetting('suddenDeath', e.target.checked)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-game-wall/30 my-4" />

        {/* Room Options */}
        <div className="space-y-3">
          <span className="font-pixel text-xs text-gray-400 uppercase">Room Options</span>

          <div className="grid grid-cols-2 gap-3">
            <Checkbox
              label="Private Room"
              checked={settings.isPrivate}
              onChange={(e) => updateSetting('isPrivate', e.target.checked)}
            />
            <Checkbox
              label="Ranked Match"
              checked={settings.isRanked}
              onChange={(e) => updateSetting('isRanked', e.target.checked)}
            />
          </div>

          {settings.isPrivate && (
            <Input
              label="Room Password"
              type="password"
              placeholder="Enter password..."
              value={settings.password || ''}
              onChange={(e) => updateSetting('password', e.target.value)}
              error={errors.password}
            />
          )}
        </div>
      </form>
    </Modal>
  );
}

export interface JoinRoomModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler */
  onSubmit: (password: string) => void;
  /** Room name */
  roomName: string;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
}

/**
 * Modal for entering password to join private room
 */
export function JoinRoomModal({
  isOpen,
  onClose,
  onSubmit,
  roomName,
  loading = false,
  error,
}: JoinRoomModalProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="JOIN PRIVATE ROOM"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            CANCEL
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !password}>
            {loading ? 'JOINING...' : 'JOIN'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-4">
          <span className="text-2xl">🔒</span>
          <p className="font-pixel text-sm text-white mt-2">{roomName}</p>
          <p className="font-retro text-xs text-gray-400 mt-1">
            This room requires a password to join
          </p>
        </div>

        <Input
          label="Password"
          type="password"
          placeholder="Enter room password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          autoFocus
        />
      </form>
    </Modal>
  );
}
