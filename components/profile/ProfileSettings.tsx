'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils/cn';
import type { ProfileSettings as ProfileSettingsType, NotificationSettings } from '@/types/api';

export interface ProfileSettingsProps {
  /** Current settings */
  settings: ProfileSettingsType;
  /** Current notification settings */
  notifications: NotificationSettings;
  /** Callback when settings are saved */
  onSave: (settings: Partial<ProfileSettingsType>, notifications: Partial<NotificationSettings>) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Profile settings editor
 */
export function ProfileSettings({
  settings,
  notifications,
  onSave,
  isLoading = false,
  className,
}: ProfileSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = <K extends keyof ProfileSettingsType>(
    key: K,
    value: ProfileSettingsType[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleNotificationChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setLocalNotifications((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(localSettings, localNotifications);
    setHasChanges(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Privacy Settings */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckboxSetting
            label="Public Profile"
            description="Allow others to view your profile"
            checked={localSettings.isPublic}
            onChange={(checked) => handleSettingChange('isPublic', checked)}
          />
          <CheckboxSetting
            label="Show Online Status"
            description="Display when you're online"
            checked={localSettings.showOnlineStatus}
            onChange={(checked) => handleSettingChange('showOnlineStatus', checked)}
          />
          <CheckboxSetting
            label="Show Current Game"
            description="Let friends see what game you're in"
            checked={localSettings.showCurrentGame}
            onChange={(checked) => handleSettingChange('showCurrentGame', checked)}
          />
          <CheckboxSetting
            label="Allow Friend Requests"
            description="Let others send you friend requests"
            checked={localSettings.allowFriendRequests}
            onChange={(checked) => handleSettingChange('allowFriendRequests', checked)}
          />
          <CheckboxSetting
            label="Allow Game Invites"
            description="Let others invite you to games"
            checked={localSettings.allowGameInvites}
            onChange={(checked) => handleSettingChange('allowGameInvites', checked)}
          />
        </CardContent>
      </Card>

      {/* Game Settings */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SliderSetting
            label="Sound Effects Volume"
            value={localSettings.sfxVolume}
            onChange={(value) => handleSettingChange('sfxVolume', value)}
          />
          <SliderSetting
            label="Music Volume"
            value={localSettings.musicVolume}
            onChange={(value) => handleSettingChange('musicVolume', value)}
          />
          <CheckboxSetting
            label="Screen Shake"
            description="Enable screen shake on explosions"
            checked={localSettings.screenShake}
            onChange={(checked) => handleSettingChange('screenShake', checked)}
          />
          <CheckboxSetting
            label="Show Player Names"
            description="Display player names above characters"
            checked={localSettings.showPlayerNames}
            onChange={(checked) => handleSettingChange('showPlayerNames', checked)}
          />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckboxSetting
            label="Push Notifications"
            description="Enable push notifications"
            checked={localNotifications.push}
            onChange={(checked) => handleNotificationChange('push', checked)}
          />
          <CheckboxSetting
            label="Email Notifications"
            description="Receive notifications via email"
            checked={localNotifications.email}
            onChange={(checked) => handleNotificationChange('email', checked)}
          />
          <div className="pl-6 space-y-3 border-l-2 border-game-wall/30">
            <CheckboxSetting
              label="Friend Requests"
              checked={localNotifications.friendRequests}
              onChange={(checked) => handleNotificationChange('friendRequests', checked)}
              disabled={!localNotifications.push && !localNotifications.email}
            />
            <CheckboxSetting
              label="Game Invites"
              checked={localNotifications.gameInvites}
              onChange={(checked) => handleNotificationChange('gameInvites', checked)}
              disabled={!localNotifications.push && !localNotifications.email}
            />
            <CheckboxSetting
              label="Tournaments"
              checked={localNotifications.tournaments}
              onChange={(checked) => handleNotificationChange('tournaments', checked)}
              disabled={!localNotifications.push && !localNotifications.email}
            />
            <CheckboxSetting
              label="Achievements"
              checked={localNotifications.achievements}
              onChange={(checked) => handleNotificationChange('achievements', checked)}
              disabled={!localNotifications.push && !localNotifications.email}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          isLoading={isLoading}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

interface CheckboxSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckboxSetting({ label, description, checked, onChange, disabled }: CheckboxSettingProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1"
      />
      <div className="flex-1">
        <label className="font-pixel text-xs text-white uppercase cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="font-retro text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

interface SliderSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function SliderSetting({ label, value, onChange }: SliderSettingProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="font-pixel text-xs text-white uppercase">{label}</label>
        <span className="font-pixel text-sm text-bomber-yellow">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={cn(
          'w-full h-2',
          'bg-retro-darker border-2 border-game-wall',
          'appearance-none cursor-pointer',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:bg-bomber-yellow',
          '[&::-webkit-slider-thumb]:border-2',
          '[&::-webkit-slider-thumb]:border-black',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-4',
          '[&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:bg-bomber-yellow',
          '[&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-black',
          '[&::-moz-range-thumb]:cursor-pointer'
        )}
      />
    </div>
  );
}
