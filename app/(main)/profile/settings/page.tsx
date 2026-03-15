'use client';

import { useProfileByClerkId, useUpdatePlayerSettings } from '@/lib/hooks/useProfile';
import { useUser } from '@clerk/nextjs';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import type { ProfileSettings as ProfileSettingsType, NotificationSettings } from '@/types/api';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { data: profile, isLoading } = useProfileByClerkId(user?.id);
  const updateSettings = useUpdatePlayerSettings();

  const handleSave = async (
    settings: Partial<ProfileSettingsType>,
    notifications: Partial<NotificationSettings>
  ) => {
    if (!profile) {
      return;
    }

    try {
      // Profile type doesn't include settings field, so we just pass the updates
      await updateSettings.mutateAsync({
        userId: profile.id,
        settings,
      });

      // TODO: Update notification settings in separate table/API
      // Future implementation for notification settings
      void notifications;

      alert('Settings saved successfully!');
    } catch (error) {
      throw error;
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-pixel text-2xl text-bomber-red mb-4">PROFILE NOT FOUND</h1>
          <Link href="/profile">
            <Button variant="primary">Back to Profile</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Default settings (Profile type doesn't include settings field)
  // Settings will be fetched/updated via the updateSettings mutation
  const settings: ProfileSettingsType = {
    isPublic: true,
    showOnlineStatus: true,
    showCurrentGame: true,
    allowFriendRequests: true,
    allowGameInvites: true,
    language: 'en',
    sfxVolume: 80,
    musicVolume: 60,
    screenShake: true,
    showPlayerNames: true,
  };

  const notifications: NotificationSettings = {
    push: false, // TODO: From database
    email: false, // TODO: From database
    friendRequests: true,
    gameInvites: true,
    tournaments: true,
    achievements: true,
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-pixel text-3xl text-bomber-yellow uppercase">Settings</h1>
        <Link href="/profile">
          <Button variant="ghost" size="md">
            Back to Profile
          </Button>
        </Link>
      </div>

      <ProfileSettings
        settings={settings}
        notifications={notifications}
        onSave={handleSave}
        isLoading={updateSettings.isPending}
      />
    </main>
  );
}
