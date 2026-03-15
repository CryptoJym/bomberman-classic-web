'use client';

import { useState, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export interface AvatarUploadProps {
  /** Current avatar URL */
  currentAvatarUrl?: string | null;
  /** Username for fallback */
  username: string;
  /** Callback when avatar is uploaded */
  onUpload: (file: File) => Promise<void>;
  /** Callback when avatar is removed */
  onRemove?: () => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Avatar selection/upload component
 */
export function AvatarUpload({
  currentAvatarUrl,
  username,
  onUpload,
  onRemove,
  isLoading = false,
  className,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    await onUpload(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleRemove = async () => {
    setPreviewUrl(null);
    if (onRemove) {
      await onRemove();
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar Preview */}
      <div className="relative">
        <Avatar
          src={displayUrl}
          alt={username}
          fallback={username[0]}
          size="xl"
          className="border-4 border-game-wall shadow-[4px_4px_0_0_rgba(0,0,0,0.8)]"
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-pixel text-white text-xs animate-pulse">
              UPLOADING...
            </span>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          'relative w-full max-w-sm p-6',
          'border-2 border-dashed',
          dragActive ? 'border-bomber-blue bg-bomber-blue/10' : 'border-game-wall bg-retro-darker/50',
          'transition-colors cursor-pointer'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={isLoading}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-3xl">📸</div>
          <p className="font-pixel text-xs text-white uppercase">
            {dragActive ? 'Drop image here' : 'Click or drag image'}
          </p>
          <p className="font-retro text-xs text-gray-500">
            PNG, JPG or GIF (max 5MB)
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          Choose File
        </Button>

        {displayUrl && onRemove && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
          >
            Remove
          </Button>
        )}
      </div>

      {/* Preset Avatars (Optional) */}
      <div className="w-full">
        <p className="font-pixel text-xs text-gray-400 uppercase mb-3 text-center">
          Or Choose Preset
        </p>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_AVATARS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                'w-12 h-12',
                'bg-retro-darker border-2 border-game-wall',
                'hover:border-bomber-blue hover:scale-110',
                'transition-all',
                'flex items-center justify-center text-xl'
              )}
              onClick={() => {
                // In a real implementation, this would set a preset avatar
                console.log('Select preset:', preset.id);
              }}
              disabled={isLoading}
            >
              {preset.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const PRESET_AVATARS = [
  { id: 'bomb', emoji: '💣' },
  { id: 'fire', emoji: '🔥' },
  { id: 'skull', emoji: '💀' },
  { id: 'crown', emoji: '👑' },
  { id: 'star', emoji: '⭐' },
  { id: 'robot', emoji: '🤖' },
  { id: 'alien', emoji: '👽' },
  { id: 'ninja', emoji: '🥷' },
  { id: 'ghost', emoji: '👻' },
  { id: 'rocket', emoji: '🚀' },
];
