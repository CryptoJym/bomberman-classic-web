'use client';

import { useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { ChatMessageDisplay, MutedUser, ChatReportReason } from '@/types/chat';

export interface ChatModerationProps {
  /** Whether moderation panel is open */
  isOpen: boolean;
  /** On close */
  onClose: () => void;
  /** Message to moderate */
  message?: ChatMessageDisplay;
  /** Muted users list */
  mutedUsers?: MutedUser[];
  /** Whether current user is host */
  isHost: boolean;
  /** On mute user */
  onMuteUser?: (userId: string, duration: number | null) => void;
  /** On unmute user */
  onUnmuteUser?: (userId: string) => void;
  /** On report message */
  onReportMessage?: (messageId: string, reason: ChatReportReason, details?: string) => void;
  /** On delete message */
  onDeleteMessage?: (messageId: string) => void;
}

const REPORT_REASONS: { value: ChatReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

const MUTE_DURATIONS = [
  { value: '300000', label: '5 minutes' },
  { value: '900000', label: '15 minutes' },
  { value: '3600000', label: '1 hour' },
  { value: 'null', label: 'Permanent' },
];

export function ChatModeration({
  isOpen,
  onClose,
  message,
  mutedUsers = [],
  isHost,
  onMuteUser,
  onUnmuteUser,
  onReportMessage,
  onDeleteMessage,
}: ChatModerationProps) {
  const [reportReason, setReportReason] = useState<ChatReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [muteDuration, setMuteDuration] = useState<string>('300000');
  const [activeTab, setActiveTab] = useState<'report' | 'moderate'>('report');

  const isUserMuted = message && mutedUsers.some(u => u.userId === message.senderId);

  const handleReport = () => {
    if (message && onReportMessage) {
      onReportMessage(message.id, reportReason, reportDetails || undefined);
      onClose();
    }
  };

  const handleMute = () => {
    if (message && onMuteUser) {
      const duration = muteDuration === 'null' ? null : parseInt(muteDuration, 10);
      onMuteUser(message.senderId, duration);
      onClose();
    }
  };

  const handleUnmute = () => {
    if (message && onUnmuteUser) {
      onUnmuteUser(message.senderId);
      onClose();
    }
  };

  const handleDelete = () => {
    if (message && onDeleteMessage) {
      if (confirm('Are you sure you want to delete this message?')) {
        onDeleteMessage(message.id);
        onClose();
      }
    }
  };

  if (!message) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Actions"
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Message preview */}
        <div className="p-3 bg-retro-dark rounded border-2 border-game-wall">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-pixel text-xs text-accent-gold">
              {message.senderUsername}
            </span>
            <span className="font-retro text-[10px] text-gray-500">
              {new Date(message.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="font-retro text-sm text-gray-200">
            {message.content}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-game-wall">
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={cn(
              'px-4 py-2 font-pixel text-xs uppercase transition-colors',
              activeTab === 'report'
                ? 'text-bomber-red border-b-2 border-bomber-red -mb-0.5'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Report
          </button>
          {isHost && (
            <button
              type="button"
              onClick={() => setActiveTab('moderate')}
              className={cn(
                'px-4 py-2 font-pixel text-xs uppercase transition-colors',
                activeTab === 'moderate'
                  ? 'text-bomber-red border-b-2 border-bomber-red -mb-0.5'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Moderate
            </button>
          )}
        </div>

        {/* Report tab */}
        {activeTab === 'report' && (
          <div className="flex flex-col gap-3">
            <Select
              label="Report Reason"
              value={reportReason}
              onChange={(value) => setReportReason(value as ChatReportReason)}
              options={REPORT_REASONS}
            />

            <div>
              <label className="block mb-2 font-pixel text-xs uppercase text-gray-300">
                Additional Details (Optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReportDetails(e.target.value)}
                placeholder="Provide more information about the report..."
                className={cn(
                  'w-full px-3 py-2 font-retro text-sm text-white',
                  'bg-retro-darker',
                  'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
                  'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]',
                  'placeholder:text-gray-500',
                  'focus:outline-none focus:border-bomber-blue',
                  'resize-none'
                )}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                CANCEL
              </Button>
              <Button variant="danger" size="sm" onClick={handleReport}>
                REPORT
              </Button>
            </div>
          </div>
        )}

        {/* Moderate tab (host only) */}
        {activeTab === 'moderate' && isHost && (
          <div className="flex flex-col gap-3">
            {!isUserMuted ? (
              <>
                <Select
                  label="Mute Duration"
                  value={muteDuration}
                  onChange={(value) => setMuteDuration(value)}
                  options={MUTE_DURATIONS}
                />

                <div className="flex gap-2">
                  <Button
                    variant="warning"
                    size="sm"
                    fullWidth
                    onClick={handleMute}
                  >
                    MUTE USER
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="success"
                size="sm"
                fullWidth
                onClick={handleUnmute}
              >
                UNMUTE USER
              </Button>
            )}

            <div className="border-t-2 border-game-wall pt-3">
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={handleDelete}
              >
                DELETE MESSAGE
              </Button>
            </div>

            <div className="flex gap-2 justify-end border-t-2 border-game-wall pt-3">
              <Button variant="secondary" size="sm" onClick={onClose}>
                CANCEL
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
