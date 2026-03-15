'use client';

import { useState, useEffect } from 'react';
import { useProfileByClerkId, useUpdateProfile } from '@/lib/hooks/useProfile';
import { useUser } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const { user, isLoaded } = useUser();
  const { data: profile, isLoading } = useProfileByClerkId(user?.id);
  const updateProfile = useUpdateProfile();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      return;
    }

    try {
      await updateProfile.mutateAsync({
        userId: profile.id,
        updates: {
          display_name: displayName || null,
          bio: bio || null,
          country_code: country || null,
        },
      });

      setHasChanges(false);
      router.push('/profile');
    } catch {
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleAvatarUpload = async () => {
    // TODO: Implement avatar upload to storage
    alert('Avatar upload not yet implemented');
  };

  const handleAvatarRemove = async () => {
    // TODO: Implement avatar removal
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

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-pixel text-3xl text-bomber-yellow uppercase">Edit Profile</h1>
        <Link href="/profile">
          <Button variant="ghost" size="md">
            Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              currentAvatarUrl={profile.avatarUrl}
              username={profile.username}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
            />
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Username"
              value={profile.username}
              disabled
              helperText="Username cannot be changed"
            />

            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Enter display name (optional)"
              helperText="This is how your name will appear to other players"
            />

            <div>
              <label className="mb-2 font-pixel text-xs uppercase tracking-wider text-gray-300 block">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Tell others about yourself..."
                rows={4}
                maxLength={200}
                className="w-full font-retro text-white bg-retro-darker border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] placeholder:text-gray-500 focus:outline-none focus:border-bomber-blue focus:ring-1 focus:ring-bomber-blue/50 transition-all duration-150 px-4 py-3 resize-none"
              />
              <p className="font-retro text-xs text-gray-500 mt-1">
                {bio.length} / 200 characters
              </p>
            </div>

            <Input
              label="Country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setHasChanges(true);
              }}
              placeholder="US"
              helperText="2-letter country code (e.g., US, UK, JP)"
              maxLength={2}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Link href="/profile">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            type="submit"
            disabled={!hasChanges || updateProfile.isPending}
            isLoading={updateProfile.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </main>
  );
}
