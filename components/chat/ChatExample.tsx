/**
 * Chat System Example Usage
 * Demonstrates how to integrate the chat system in your app
 */

'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { useChat } from '@/lib/hooks/useChat';
import { useChatConnection } from '@/lib/hooks/useChatConnection';
import { ChatBox } from './ChatBox';
import type { ChatReportReason } from '@/types/chat';

interface ChatExampleProps {
  /** Chat context */
  context: 'lobby' | 'room' | 'game' | 'private';
  /** Context ID (room ID, game ID, etc.) */
  contextId?: string;
  /** Whether user is host */
  isHost?: boolean;
  /** Unlocked achievements for special emotes */
  unlockedAchievements?: string[];
}

/**
 * Example: Complete chat integration
 */
export function ChatExample({
  context,
  contextId,
  isHost = false,
  unlockedAchievements = [],
}: ChatExampleProps) {
  // Get authenticated user
  const { user, userId } = useAuth();
  const { data: profile } = useProfile(userId || undefined);

  // Initialize chat state - Always call hooks unconditionally
  const {
    state,
    sendMessage: sendLocalMessage,
    addMessage,
    addSystemMessage,
    muteUser,
    unmuteUser,
    deleteMessage,
    reportMessage,
  } = useChat({
    context,
    contextId,
    userId: profile?.id || '',
    username: profile?.username || '',
    isHost,
  });

  // Initialize real-time connection - Always call hooks unconditionally
  const { isConnected, sendMessage: sendRealtimeMessage } = useChatConnection({
    context,
    contextId,
    userId: profile?.id || '',
    autoConnect: true,
    onMessageReceived: (message) => {
      addMessage(message);
    },
    onConnectionChange: (connected) => {
      addSystemMessage({
        type: 'system',
        messageType: connected ? 'player_joined' : 'player_left',
        content: connected ? 'Connected to chat' : 'Disconnected from chat',
        timestamp: Date.now(),
      });
    },
    onError: (error) => {
      console.error('Chat connection error:', error);
      addSystemMessage({
        type: 'system',
        messageType: 'player_left',
        content: 'Chat error. Please refresh.',
        timestamp: Date.now(),
      });
    },
  });

  // Early return after all hooks have been called
  if (!user || !profile) {
    return <div>Please sign in to use chat</div>;
  }

  // Handle sending messages
  const handleSendMessage = async (
    content: string,
    type: 'text' | 'emoji' | 'quick_chat' = 'text'
  ) => {
    try {
      // Send via real-time connection (will be broadcast to all users)
      await sendRealtimeMessage(content, type);

      // Also process locally for immediate feedback
      await sendLocalMessage(content, type);
    } catch (error) {
      console.error('Failed to send message:', error);
      addSystemMessage({
        type: 'system',
        messageType: 'player_left',
        content: 'Failed to send message. Please try again.',
        timestamp: Date.now(),
      });
    }
  };

  return (
    <ChatBox
      context={context}
      contextId={contextId}
      messages={state.messages}
      systemMessages={state.systemMessages}
      isConnected={isConnected}
      isLoading={state.isLoadingHistory}
      isSending={state.isSending}
      currentUserId={profile.id}
      isHost={isHost}
      unreadCount={state.unreadCount}
      unlockedAchievements={unlockedAchievements}
      onSendMessage={handleSendMessage}
      onMuteUser={muteUser}
      onUnmuteUser={unmuteUser}
      onReportMessage={(messageId, reason, details) => {
        reportMessage(messageId, reason as ChatReportReason, details);
      }}
      onDeleteMessage={deleteMessage}
      showHeader
      height="600px"
    />
  );
}

/**
 * Example: Minimal chat for in-game use
 */
export function InGameChat({ gameId }: { gameId: string }) {
  const { user, userId } = useAuth();
  const { data: profile } = useProfile(userId || undefined);

  const { state, sendMessage, addMessage } = useChat({
    context: 'game',
    contextId: gameId,
    userId: profile?.id || '',
    username: profile?.username || '',
  });

  const { isConnected, sendMessage: sendRealtime } = useChatConnection({
    context: 'game',
    contextId: gameId,
    userId: profile?.id || '',
    onMessageReceived: addMessage,
  });

  if (!user || !profile) {
    return null;
  }

  const handleSend = async (content: string, type: 'text' | 'emoji' | 'quick_chat') => {
    await sendRealtime(content, type);
    await sendMessage(content, type);
  };

  return (
    <ChatBox
      context="game"
      contextId={gameId}
      messages={state.messages}
      isConnected={isConnected}
      currentUserId={profile.id}
      onSendMessage={handleSend}
      showHeader={false}
      compact
      height="300px"
    />
  );
}

/**
 * Example: Lobby chat (global)
 */
export function LobbyChat() {
  const { user, userId } = useAuth();
  const { data: profile } = useProfile(userId || undefined);

  const { state, sendMessage, addMessage, addSystemMessage } = useChat({
    context: 'lobby',
    userId: profile?.id || '',
    username: profile?.username || '',
  });

  const { isConnected, sendMessage: sendRealtime } = useChatConnection({
    context: 'lobby',
    userId: profile?.id || '',
    onMessageReceived: addMessage,
    onConnectionChange: (connected) => {
      addSystemMessage({
        type: 'system',
        messageType: connected ? 'player_joined' : 'player_left',
        content: connected
          ? `${profile?.username || 'User'} joined the lobby`
          : `${profile?.username || 'User'} left the lobby`,
        timestamp: Date.now(),
      });
    },
  });

  if (!user || !profile) {
    return null;
  }

  const handleSend = async (content: string, type: 'text' | 'emoji' | 'quick_chat') => {
    await sendRealtime(content, type);
    await sendMessage(content, type);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <ChatBox
        context="lobby"
        messages={state.messages}
        systemMessages={state.systemMessages}
        isConnected={isConnected}
        currentUserId={profile.id}
        unreadCount={state.unreadCount}
        onSendMessage={handleSend}
        showHeader
        height="500px"
      />
    </div>
  );
}

/**
 * Example: Private message chat
 */
export function PrivateChat({ friendId }: { friendId: string }) {
  const { user, userId } = useAuth();
  const { data: profile } = useProfile(userId || undefined);

  // Create a deterministic chat ID from both user IDs
  const chatId = [profile?.id || '', friendId].sort().join('-');

  const { state, sendMessage, addMessage } = useChat({
    context: 'private',
    contextId: chatId,
    userId: profile?.id || '',
    username: profile?.username || '',
  });

  const { isConnected, sendMessage: sendRealtime } = useChatConnection({
    context: 'private',
    contextId: chatId,
    userId: profile?.id || '',
    onMessageReceived: addMessage,
  });

  if (!user || !profile) {
    return null;
  }

  const handleSend = async (content: string, type: 'text' | 'emoji' | 'quick_chat') => {
    await sendRealtime(content, type);
    await sendMessage(content, type);
  };

  return (
    <ChatBox
      context="private"
      contextId={chatId}
      messages={state.messages}
      isConnected={isConnected}
      currentUserId={profile.id}
      onSendMessage={handleSend}
      showHeader
      height="600px"
    />
  );
}
