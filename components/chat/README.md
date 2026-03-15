# Chat System - Bomberman Online

Complete real-time chat system with SNES-style retro design.

## Features

- **Multiple Chat Contexts**: Lobby, Room, Game, and Private messages
- **Real-time Communication**: Powered by Supabase Realtime
- **Rich Messaging**: Text, emojis, and quick chat messages
- **Moderation Tools**: Mute, report, and delete messages (host/admin)
- **Profanity Filter**: Automatic content filtering
- **Rate Limiting**: Anti-spam protection
- **Chat Commands**: `/me`, `/roll`, `/shrug`, etc.
- **Quick Chat**: Predefined messages for in-game use
- **Emoji Picker**: Custom emotes with unlock requirements
- **Message History**: Pagination and infinite scroll

## Components

### ChatBox
Main chat container component with all features integrated.

```tsx
import { ChatBox } from '@/components/chat';

<ChatBox
  context="room"
  contextId={roomId}
  messages={messages}
  systemMessages={systemMessages}
  isConnected={true}
  currentUserId={userId}
  isHost={true}
  onSendMessage={handleSendMessage}
/>
```

### ChatMessages
Message list with auto-scroll and infinite loading.

```tsx
import { ChatMessages } from '@/components/chat';

<ChatMessages
  messages={messages}
  systemMessages={systemMessages}
  showTimestamps
  showAvatars
  autoScroll
  onLoadMore={loadMore}
/>
```

### ChatInput
Message input with emoji and quick chat buttons.

```tsx
import { ChatInput } from '@/components/chat';

<ChatInput
  placeholder="Type a message..."
  onSendMessage={handleSend}
  onOpenEmojiPicker={() => setEmojiOpen(true)}
  onOpenQuickChat={() => setQuickChatOpen(true)}
/>
```

### EmojiPicker
Modal picker for emojis and emotes.

```tsx
import { EmojiPicker } from '@/components/chat';

<EmojiPicker
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSelectEmoji={handleSelect}
  unlockedAchievements={achievements}
/>
```

### QuickChat
Modal with predefined quick chat messages.

```tsx
import { QuickChat } from '@/components/chat';

<QuickChat
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSelectMessage={handleSelect}
/>
```

### ChatModeration
Moderation panel for hosts/admins.

```tsx
import { ChatModeration } from '@/components/chat';

<ChatModeration
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  message={selectedMessage}
  isHost={true}
  onMuteUser={handleMute}
  onReportMessage={handleReport}
/>
```

## Hooks

### useChat
Manages chat state and local operations.

```tsx
import { useChat } from '@/lib/hooks/useChat';

const {
  state,
  sendMessage,
  addMessage,
  addSystemMessage,
  clearMessages,
  muteUser,
  unmuteUser,
} = useChat({
  context: 'room',
  contextId: roomId,
  userId,
  username,
  isHost: true,
});
```

### useChatConnection
Manages real-time connection via Supabase.

```tsx
import { useChatConnection } from '@/lib/hooks/useChatConnection';

const { isConnected, sendMessage, connect, disconnect } = useChatConnection({
  context: 'room',
  contextId: roomId,
  userId,
  onMessageReceived: handleMessage,
  onConnectionChange: handleConnectionChange,
});
```

## Utilities

### Emotes
Manage chat emotes and emojis.

```ts
import { EMOTES, parseEmotes, getUserEmotes } from '@/lib/chat/emotes';

// Parse emote codes in text
const parsed = parseEmotes('Nice bomb! :bomb:');

// Get user's unlocked emotes
const userEmotes = getUserEmotes(unlockedAchievements);
```

### Filter
Content moderation and rate limiting.

```ts
import { processMessage, MessageRateLimiter } from '@/lib/chat/filter';

// Process and validate message
const result = processMessage(userInput);
if (result.valid) {
  sendMessage(result.sanitized);
}

// Rate limiting
const limiter = new MessageRateLimiter();
const canSend = limiter.canSendMessage(userId, message);
```

### Commands
Chat command system.

```ts
import { executeCommand, isCommand } from '@/lib/chat/commands';

if (isCommand(message)) {
  const result = executeCommand(message, {
    userId,
    username,
    isHost: true,
    isAdmin: false,
  });
}
```

### Quick Chat
Predefined messages for fast communication.

```ts
import {
  QUICK_CHAT_MESSAGES,
  getQuickChatByCategory,
  getQuickChatByShortcut,
} from '@/lib/chat/quickChat';

// Get messages by category
const greetings = getQuickChatByCategory('greeting');

// Get by keyboard shortcut
const message = getQuickChatByShortcut(1); // "Hello!"
```

## API Routes

### POST /api/chat
Send a chat message.

```ts
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    content: 'Hello!',
    type: 'text',
    context: 'room',
    contextId: roomId,
  }),
});
```

### GET /api/chat
Get chat messages.

```ts
const response = await fetch(
  `/api/chat?context=room&contextId=${roomId}&limit=50`
);
const { messages, hasMore, total } = await response.json();
```

### GET /api/chat/history
Get paginated message history.

```ts
const response = await fetch(
  `/api/chat/history?context=room&contextId=${roomId}&limit=100&offset=0`
);
const { messages, pagination } = await response.json();
```

### POST /api/chat/report
Report a message.

```ts
const response = await fetch('/api/chat/report', {
  method: 'POST',
  body: JSON.stringify({
    messageId: 'msg-123',
    reason: 'spam',
    details: 'User is spamming chat',
  }),
});
```

## Database Schema

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'emoji', 'quick_chat', 'system')),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_messages_game_id ON chat_messages(game_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

### chat_reports
```sql
CREATE TABLE chat_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) NOT NULL,
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_reports_message_id ON chat_reports(message_id);
CREATE INDEX idx_chat_reports_status ON chat_reports(status);
```

## Chat Types

### Lobby Chat
Global chat visible to all players in the lobby.

```tsx
<ChatBox context="lobby" />
```

### Room Chat
Chat specific to a game room (pre-game).

```tsx
<ChatBox context="room" contextId={roomId} />
```

### Game Chat
In-game chat (often using quick chat).

```tsx
<ChatBox context="game" contextId={gameId} compact />
```

### Private Messages
Direct messages between friends.

```tsx
<ChatBox context="private" contextId={friendshipId} />
```

## Styling

All components use SNES-style retro design:
- Pixel fonts (`font-pixel`, `font-retro`)
- Retro color palette (bomber-red, bomber-blue, etc.)
- Inset borders for depth
- Pixel-perfect shadows
- Animated transitions

## Rate Limits

- **10 messages per minute** per user
- **2 messages per second** max burst
- **3 second cooldown** for duplicate messages

## Commands

Available chat commands:

- `/me <action>` - Perform an action
- `/shrug` - Send shrug emoji
- `/tableflip` - Flip a table
- `/roll [max]` - Roll random number
- `/help` - Show available commands
- `/clear` - Clear your chat

## Quick Chat Categories

- **Greeting**: Hello, GG, GLHF, Bye
- **Gameplay**: Nice, Nice bomb, Close, Lucky
- **Strategy**: Wait, Let's go, Help, Watch out
- **Reaction**: Wow, OMG, LOL, Oops, Sorry
- **Taunt**: Too slow, Can't catch me, Ez, Rematch

## Emote Categories

- **Basic**: Smile, Laugh, Cool, Angry, Sad, etc.
- **Reaction**: Thumbs up/down, Clap, Wave, OK
- **Special**: Bomb, Explosion, Trophy, Crown (unlockable)
- **Seasonal**: Holiday-specific emotes

## Best Practices

1. **Always validate user input** before sending
2. **Use rate limiting** to prevent spam
3. **Filter profanity** automatically
4. **Mute users temporarily** rather than permanent bans
5. **Log all reports** for moderation review
6. **Auto-scroll to latest** message
7. **Show typing indicators** for active users
8. **Display system messages** for important events
9. **Support keyboard shortcuts** for quick chat
10. **Maintain message history** for context

## Future Enhancements

- [ ] Voice chat integration
- [ ] GIF support
- [ ] Custom emote uploads
- [ ] Chat badges/titles
- [ ] Message reactions
- [ ] Thread/reply system
- [ ] Chat translations
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Message search
