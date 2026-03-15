'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import type { RoomSettings } from '@/types/game';

export interface RoomSettingsProps {
  /** Current room settings */
  settings: RoomSettings;
  /** Callback when settings are updated */
  onUpdate: (settings: Partial<RoomSettings>) => void;
  /** Whether settings can be edited (host only) */
  canEdit?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Room settings panel component
 * Allows host to configure game room settings
 */
export function RoomSettingsPanel({
  settings,
  onUpdate,
  canEdit = true,
  className,
}: RoomSettingsProps) {
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateLocalSetting = <K extends keyof RoomSettings>(
    key: K,
    value: RoomSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Room Settings</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Max Players */}
        <Select
          label="Max Players"
          value={localSettings.maxPlayers.toString()}
          onChange={(value) => updateLocalSetting('maxPlayers', parseInt(value))}
          disabled={!canEdit}
          options={[
            { value: '2', label: '2 Players' },
            { value: '4', label: '4 Players' },
            { value: '6', label: '6 Players' },
            { value: '8', label: '8 Players' },
            { value: '12', label: '12 Players' },
            { value: '16', label: '16 Players' },
          ]}
        />

        {/* Rounds to Win */}
        <Select
          label="Rounds to Win"
          value={localSettings.roundsToWin.toString()}
          onChange={(value) => updateLocalSetting('roundsToWin', parseInt(value))}
          disabled={!canEdit}
          options={[
            { value: '1', label: '1 Round (Quick)' },
            { value: '3', label: '3 Rounds (Best of 5)' },
            { value: '5', label: '5 Rounds (Best of 9)' },
            { value: '7', label: '7 Rounds (Best of 13)' },
          ]}
        />

        {/* Round Time */}
        <Select
          label="Round Time Limit"
          value={localSettings.roundTime.toString()}
          onChange={(value) => updateLocalSetting('roundTime', parseInt(value))}
          disabled={!canEdit}
          options={[
            { value: '60', label: '1 Minute' },
            { value: '120', label: '2 Minutes' },
            { value: '180', label: '3 Minutes' },
            { value: '240', label: '4 Minutes' },
            { value: '300', label: '5 Minutes' },
            { value: '0', label: 'No Limit' },
          ]}
        />

        {/* Starting Stats */}
        <div className="space-y-3 pt-2">
          <h4 className="font-pixel text-xs uppercase text-bomber-yellow">
            Starting Stats
          </h4>

          <Select
            label="Starting Bombs"
            value={localSettings.startingBombs.toString()}
            onChange={(value) => updateLocalSetting('startingBombs', parseInt(value))}
            disabled={!canEdit}
            options={[
              { value: '1', label: '1 Bomb' },
              { value: '2', label: '2 Bombs' },
              { value: '3', label: '3 Bombs' },
              { value: '5', label: '5 Bombs' },
            ]}
          />

          <Select
            label="Starting Fire Radius"
            value={localSettings.startingRadius.toString()}
            onChange={(value) => updateLocalSetting('startingRadius', parseInt(value))}
            disabled={!canEdit}
            options={[
              { value: '1', label: '1 Tile' },
              { value: '2', label: '2 Tiles' },
              { value: '3', label: '3 Tiles' },
              { value: '5', label: '5 Tiles' },
            ]}
          />

          <Select
            label="Starting Speed"
            value={localSettings.startingSpeed.toString()}
            onChange={(value) => updateLocalSetting('startingSpeed', parseFloat(value))}
            disabled={!canEdit}
            options={[
              { value: '0.8', label: 'Slow (0.8x)' },
              { value: '1.0', label: 'Normal (1.0x)' },
              { value: '1.2', label: 'Fast (1.2x)' },
              { value: '1.5', label: 'Very Fast (1.5x)' },
            ]}
          />
        </div>

        {/* Powerups */}
        <div className="space-y-3 pt-2">
          <h4 className="font-pixel text-xs uppercase text-bomber-yellow">
            Powerups
          </h4>

          <Select
            label="Powerup Frequency"
            value={localSettings.powerupFrequency.toString()}
            onChange={(value) => updateLocalSetting('powerupFrequency', parseFloat(value))}
            disabled={!canEdit}
            options={[
              { value: '0', label: 'None' },
              { value: '0.3', label: 'Low' },
              { value: '0.5', label: 'Normal' },
              { value: '0.7', label: 'High' },
              { value: '1.0', label: 'Maximum' },
            ]}
          />
        </div>

        {/* Sudden Death */}
        <div className="space-y-3 pt-2">
          <h4 className="font-pixel text-xs uppercase text-bomber-yellow">
            Sudden Death
          </h4>

          <Checkbox
            label="Enable Sudden Death"
            description="Map shrinks after time limit"
            checked={localSettings.suddenDeathEnabled}
            onChange={(e) => updateLocalSetting('suddenDeathEnabled', e.target.checked)}
            disabled={!canEdit}
          />

          {localSettings.suddenDeathEnabled && (
            <Select
              label="Sudden Death Time"
              value={localSettings.suddenDeathTime.toString()}
              onChange={(value) => updateLocalSetting('suddenDeathTime', parseInt(value))}
              disabled={!canEdit}
              options={[
                { value: '60', label: 'After 1 minute' },
                { value: '90', label: 'After 1.5 minutes' },
                { value: '120', label: 'After 2 minutes' },
                { value: '180', label: 'After 3 minutes' },
              ]}
            />
          )}
        </div>

        {/* Room Options */}
        <div className="space-y-3 pt-2 border-t-2 border-game-wall/30 mt-4 pt-4">
          <h4 className="font-pixel text-xs uppercase text-bomber-yellow">
            Room Options
          </h4>

          <Checkbox
            label="Private Room"
            description="Requires password to join"
            checked={localSettings.isPrivate}
            onChange={(e) => updateLocalSetting('isPrivate', e.target.checked)}
            disabled={!canEdit}
          />

          {localSettings.isPrivate && (
            <Input
              label="Room Password"
              type="password"
              value={localSettings.password || ''}
              onChange={(e) => updateLocalSetting('password', e.target.value)}
              disabled={!canEdit}
              placeholder="Enter password"
              helperText="Players need this password to join"
            />
          )}

          <Checkbox
            label="Allow Spectators"
            description="Let others watch the game"
            checked={localSettings.allowSpectators}
            onChange={(e) => updateLocalSetting('allowSpectators', e.target.checked)}
            disabled={!canEdit}
          />
        </div>

        {/* Action buttons */}
        {canEdit && hasChanges && (
          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              fullWidth
            >
              Save Changes
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              fullWidth
            >
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Read-only settings display
 */
export interface RoomSettingsDisplayProps {
  settings: RoomSettings;
  className?: string;
}

export function RoomSettingsDisplay({ settings, className }: RoomSettingsDisplayProps) {
  const settingItems = [
    { label: 'Players', value: `Up to ${settings.maxPlayers}` },
    { label: 'Rounds', value: `Best of ${settings.roundsToWin * 2 - 1}` },
    {
      label: 'Round Time',
      value: settings.roundTime > 0 ? `${Math.floor(settings.roundTime / 60)} min` : 'No limit',
    },
    { label: 'Starting Bombs', value: settings.startingBombs },
    { label: 'Starting Radius', value: `${settings.startingRadius} tiles` },
    { label: 'Starting Speed', value: `${settings.startingSpeed}x` },
    {
      label: 'Powerups',
      value:
        settings.powerupFrequency === 0
          ? 'None'
          : settings.powerupFrequency < 0.4
          ? 'Low'
          : settings.powerupFrequency < 0.6
          ? 'Normal'
          : settings.powerupFrequency < 0.8
          ? 'High'
          : 'Maximum',
    },
    {
      label: 'Sudden Death',
      value: settings.suddenDeathEnabled
        ? `After ${Math.floor(settings.suddenDeathTime / 60)} min`
        : 'Disabled',
    },
    { label: 'Spectators', value: settings.allowSpectators ? 'Allowed' : 'Not allowed' },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {settingItems.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 p-2 bg-retro-darker/30 border border-game-wall/20"
        >
          <span className="font-pixel text-[10px] text-gray-500 uppercase">
            {item.label}
          </span>
          <span className="font-retro text-sm text-white">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
