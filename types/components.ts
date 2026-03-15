/**
 * Component Props Types for Bomberman Online
 * Type definitions for React component props
 */

import type { ReactNode, CSSProperties, MouseEvent, KeyboardEvent } from 'react';
import type {
  Player,
  PlayerSummary,
  PlayerColor,
  GameState,
  RoomState,
  RoomSettings,
  GameMap,
  Position,
  PowerupType,
} from './game';
import type {
  Profile,
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardTimeFilter,
  Achievement,
  PlayerAchievement,
  Tournament,
  TournamentMatch,
  GameSummary,
  Friend,
  FriendRequest,
  MapListItem,
  RankTier,
} from './api';

// ============================================================================
// COMMON PROPS
// ============================================================================

/**
 * Base props for all components
 */
export interface BaseProps {
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Props for components with children
 */
export interface WithChildren {
  children?: ReactNode;
}

/**
 * Props for components that can be disabled
 */
export interface Disableable {
  /** Whether component is disabled */
  disabled?: boolean;
}

/**
 * Props for components with loading state
 */
export interface Loadable {
  /** Whether component is in loading state */
  loading?: boolean;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';

/**
 * Button size types
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props
 */
export interface ButtonProps extends BaseProps, Disableable, Loadable {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to display before text */
  leftIcon?: ReactNode;
  /** Icon to display after text */
  rightIcon?: ReactNode;
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: ReactNode;
}

/**
 * Input component props
 */
export interface InputProps extends BaseProps, Disableable {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  /** Input name */
  name?: string;
  /** Current value */
  value?: string | number;
  /** Default value */
  defaultValue?: string | number;
  /** Placeholder text */
  placeholder?: string;
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Max length */
  maxLength?: number;
  /** Icon to display in input */
  icon?: ReactNode;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Key down handler */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseProps, WithChildren {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Footer content */
  footer?: ReactNode;
}

/**
 * Card component props
 */
export interface CardProps extends BaseProps, WithChildren {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Header actions */
  headerActions?: ReactNode;
  /** Whether card is clickable */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether to add padding */
  noPadding?: boolean;
}

/**
 * Avatar component props
 */
export interface AvatarProps extends BaseProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text / fallback text */
  alt: string;
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show online indicator */
  showOnlineStatus?: boolean;
  /** Whether user is online */
  isOnline?: boolean;
  /** Rank tier for border color */
  rankTier?: RankTier;
}

/**
 * Badge component props
 */
export interface BadgeProps extends BaseProps {
  /** Badge variant/color */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Badge size */
  size?: 'sm' | 'md';
  /** Badge content */
  children: ReactNode;
}

/**
 * Spinner/Loader component props
 */
export interface SpinnerProps extends BaseProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Color */
  color?: 'primary' | 'white' | 'inherit';
}

/**
 * Toast notification props
 */
export interface ToastProps {
  /** Toast ID */
  id: string;
  /** Toast type */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Toast title */
  title: string;
  /** Toast message */
  message?: string;
  /** Duration in ms (0 for persistent) */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Tabs component props
 */
export interface TabsProps extends BaseProps {
  /** Tab items */
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  /** Active tab ID */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (tabId: string) => void;
}

/**
 * Dropdown/Select component props
 */
export interface SelectProps<T = string> extends BaseProps, Disableable {
  /** Select options */
  options: Array<{
    value: T;
    label: string;
    disabled?: boolean;
  }>;
  /** Current value */
  value?: T;
  /** Placeholder */
  placeholder?: string;
  /** Label */
  label?: string;
  /** Error message */
  error?: string;
  /** Change handler */
  onChange: (value: T) => void;
}

/**
 * Tooltip component props
 */
export interface TooltipProps extends BaseProps, WithChildren {
  /** Tooltip content */
  content: ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing (ms) */
  delay?: number;
}

// ============================================================================
// GAME COMPONENT PROPS
// ============================================================================

/**
 * Main game board component props
 */
export interface GameBoardProps extends BaseProps {
  /** Current game state */
  gameState: GameState;
  /** Local player ID */
  localPlayerId: string;
  /** Whether in spectator mode */
  isSpectator?: boolean;
  /** Player to follow (spectator) */
  followPlayerId?: string | null;
  /** Callback when game is ready */
  onReady?: () => void;
  /** Show debug overlay */
  showDebug?: boolean;
}

/**
 * Player character component props
 */
export interface PlayerCharacterProps extends BaseProps {
  /** Player data */
  player: Player;
  /** Whether this is the local player */
  isLocalPlayer?: boolean;
  /** Whether to show name label */
  showName?: boolean;
  /** Animation speed multiplier */
  animationSpeed?: number;
}

/**
 * Player HUD component props
 */
export interface PlayerHUDProps extends BaseProps {
  /** Player data */
  player: Player;
  /** Current powerups display */
  showPowerups?: boolean;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Game timer component props
 */
export interface GameTimerProps extends BaseProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Total time (for progress) */
  totalTime?: number;
  /** Whether in sudden death */
  isSuddenDeath?: boolean;
  /** Warning threshold (seconds) */
  warningThreshold?: number;
}

/**
 * Scoreboard component props
 */
export interface ScoreboardProps extends BaseProps {
  /** All players */
  players: PlayerSummary[];
  /** Round wins per player */
  roundWins: Record<string, number>;
  /** Rounds to win */
  roundsToWin: number;
  /** Current round */
  currentRound: number;
  /** Highlight player ID */
  highlightPlayerId?: string;
}

/**
 * Powerup indicator component props
 */
export interface PowerupIndicatorProps extends BaseProps {
  /** Powerup type */
  type: PowerupType;
  /** Count (for stackable powerups) */
  count?: number;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltip */
  showTooltip?: boolean;
}

/**
 * Kill feed component props
 */
export interface KillFeedProps extends BaseProps {
  /** Kill events */
  events: Array<{
    id: string;
    killerId: string;
    killerName: string;
    victimId: string;
    victimName: string;
    timestamp: number;
  }>;
  /** Maximum events to display */
  maxEvents?: number;
}

/**
 * Game result overlay props
 */
export interface GameResultProps extends BaseProps {
  /** Winner info */
  winner: {
    id: string;
    username: string;
    color: PlayerColor;
  } | null;
  /** All player results */
  results: Array<{
    playerId: string;
    username: string;
    placement: number;
    kills: number;
    deaths: number;
    eloChange: number;
  }>;
  /** Whether local player won */
  isLocalWinner: boolean;
  /** Play again callback */
  onPlayAgain?: () => void;
  /** Return to lobby callback */
  onReturnToLobby?: () => void;
}

// ============================================================================
// LOBBY COMPONENT PROPS
// ============================================================================

/**
 * Room browser component props
 */
export interface RoomBrowserProps extends BaseProps {
  /** Available rooms */
  rooms: Array<{
    id: string;
    roomCode: string;
    hostUsername: string;
    playerCount: number;
    maxPlayers: number;
    mapName: string;
    isPrivate: boolean;
  }>;
  /** Loading state */
  loading?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Join room callback */
  onJoinRoom: (roomCode: string, password?: string) => void;
}

/**
 * Room lobby component props
 */
export interface RoomLobbyProps extends BaseProps {
  /** Room state */
  roomState: RoomState;
  /** Local player ID */
  localPlayerId: string;
  /** Toggle ready callback */
  onToggleReady: () => void;
  /** Start game callback (host only) */
  onStartGame?: () => void;
  /** Leave room callback */
  onLeaveRoom: () => void;
  /** Update settings callback (host only) */
  onUpdateSettings?: (settings: Partial<RoomSettings>) => void;
  /** Kick player callback (host only) */
  onKickPlayer?: (playerId: string) => void;
}

/**
 * Player slot component props
 */
export interface PlayerSlotProps extends BaseProps {
  /** Player in this slot */
  player?: PlayerSummary;
  /** Slot number */
  slotNumber: number;
  /** Whether slot is for local player */
  isLocalPlayer?: boolean;
  /** Whether local player is host */
  isLocalHost?: boolean;
  /** Kick callback */
  onKick?: () => void;
  /** Empty slot click callback */
  onEmptyClick?: () => void;
}

/**
 * Room settings panel props
 */
export interface RoomSettingsProps extends BaseProps {
  /** Current settings */
  settings: RoomSettings;
  /** Whether editable */
  editable?: boolean;
  /** Settings change callback */
  onChange?: (settings: Partial<RoomSettings>) => void;
  /** Available maps */
  availableMaps?: MapListItem[];
}

/**
 * Map selector component props
 */
export interface MapSelectorProps extends BaseProps {
  /** Currently selected map */
  selectedMapId?: string | null;
  /** Available maps */
  maps: MapListItem[];
  /** Loading state */
  loading?: boolean;
  /** Selection callback */
  onSelect: (mapId: string) => void;
  /** Include random option */
  includeRandom?: boolean;
}

/**
 * Color picker component props
 */
export interface ColorPickerProps extends BaseProps {
  /** Selected color */
  selectedColor: PlayerColor;
  /** Taken colors */
  takenColors: PlayerColor[];
  /** Selection callback */
  onSelect: (color: PlayerColor) => void;
}

/**
 * Chat component props
 */
export interface ChatProps extends BaseProps {
  /** Chat messages */
  messages: Array<{
    id: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: 'text' | 'emoji' | 'system';
    timestamp: number;
  }>;
  /** Send message callback */
  onSendMessage: (content: string) => void;
  /** Local player ID */
  localPlayerId: string;
  /** Max height */
  maxHeight?: number;
  /** Show timestamps */
  showTimestamps?: boolean;
}

// ============================================================================
// PROFILE COMPONENT PROPS
// ============================================================================

/**
 * Profile card component props
 */
export interface ProfileCardProps extends BaseProps {
  /** Profile data */
  profile: Profile;
  /** Whether this is the current user */
  isOwnProfile?: boolean;
  /** Edit callback (own profile) */
  onEdit?: () => void;
  /** Add friend callback */
  onAddFriend?: () => void;
  /** Show stats */
  showStats?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Stats display component props
 */
export interface StatsDisplayProps extends BaseProps {
  /** Stats to display */
  stats: {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    winRate: number;
    kdRatio: number;
  };
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Show labels */
  showLabels?: boolean;
}

/**
 * Rank badge component props
 */
export interface RankBadgeProps extends BaseProps {
  /** Rank tier */
  tier: RankTier;
  /** ELO rating */
  elo?: number;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show label */
  showLabel?: boolean;
}

/**
 * Match history component props
 */
export interface MatchHistoryProps extends BaseProps {
  /** Match history items */
  matches: GameSummary[];
  /** Loading state */
  loading?: boolean;
  /** Load more callback */
  onLoadMore?: () => void;
  /** Has more items */
  hasMore?: boolean;
  /** Match click callback */
  onMatchClick?: (matchId: string) => void;
}

/**
 * Profile edit form props
 */
export interface ProfileEditFormProps extends BaseProps {
  /** Initial profile data */
  profile: Profile;
  /** Save callback */
  onSave: (data: {
    displayName?: string;
    bio?: string;
    country?: string;
  }) => Promise<void>;
  /** Cancel callback */
  onCancel: () => void;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// LEADERBOARD COMPONENT PROPS
// ============================================================================

/**
 * Leaderboard component props
 */
export interface LeaderboardProps extends BaseProps {
  /** Leaderboard entries */
  entries: LeaderboardEntry[];
  /** Current type */
  type: LeaderboardType;
  /** Current time filter */
  timeFilter: LeaderboardTimeFilter;
  /** Type change callback */
  onTypeChange: (type: LeaderboardType) => void;
  /** Time filter change callback */
  onTimeFilterChange: (filter: LeaderboardTimeFilter) => void;
  /** Loading state */
  loading?: boolean;
  /** Current user's entry */
  currentUserEntry?: LeaderboardEntry;
  /** Entry click callback */
  onEntryClick?: (playerId: string) => void;
}

/**
 * Leaderboard entry component props
 */
export interface LeaderboardEntryProps extends BaseProps {
  /** Entry data */
  entry: LeaderboardEntry;
  /** Whether highlighted (current user) */
  highlighted?: boolean;
  /** Click callback */
  onClick?: () => void;
}

// ============================================================================
// ACHIEVEMENT COMPONENT PROPS
// ============================================================================

/**
 * Achievement list component props
 */
export interface AchievementListProps extends BaseProps {
  /** Achievements */
  achievements: PlayerAchievement[];
  /** Filter by category */
  category?: string;
  /** Show locked achievements */
  showLocked?: boolean;
  /** Achievement click callback */
  onAchievementClick?: (achievement: Achievement) => void;
}

/**
 * Achievement card component props
 */
export interface AchievementCardProps extends BaseProps {
  /** Achievement data */
  achievement: PlayerAchievement;
  /** Click callback */
  onClick?: () => void;
  /** Show progress */
  showProgress?: boolean;
}

/**
 * Achievement unlock toast props
 */
export interface AchievementToastProps extends BaseProps {
  /** Achievement that was unlocked */
  achievement: Achievement;
  /** Dismiss callback */
  onDismiss: () => void;
}

// ============================================================================
// TOURNAMENT COMPONENT PROPS
// ============================================================================

/**
 * Tournament list component props
 */
export interface TournamentListProps extends BaseProps {
  /** Tournaments */
  tournaments: Tournament[];
  /** Loading state */
  loading?: boolean;
  /** Tournament click callback */
  onTournamentClick: (tournamentId: string) => void;
}

/**
 * Tournament bracket component props
 */
export interface TournamentBracketProps extends BaseProps {
  /** Tournament data */
  tournament: Tournament;
  /** Current user's ID */
  currentUserId?: string;
  /** Match click callback */
  onMatchClick?: (match: TournamentMatch) => void;
}

/**
 * Tournament match component props
 */
export interface TournamentMatchProps extends BaseProps {
  /** Match data */
  match: TournamentMatch;
  /** Whether current user is in match */
  isUserMatch?: boolean;
  /** Click callback */
  onClick?: () => void;
}

// ============================================================================
// SOCIAL COMPONENT PROPS
// ============================================================================

/**
 * Friends list component props
 */
export interface FriendsListProps extends BaseProps {
  /** Friends */
  friends: Friend[];
  /** Pending requests */
  pendingRequests?: FriendRequest[];
  /** Loading state */
  loading?: boolean;
  /** Friend click callback */
  onFriendClick: (friendId: string) => void;
  /** Invite to game callback */
  onInvite?: (friendId: string) => void;
  /** Remove friend callback */
  onRemove?: (friendId: string) => void;
  /** Accept request callback */
  onAcceptRequest?: (requestId: string) => void;
  /** Decline request callback */
  onDeclineRequest?: (requestId: string) => void;
}

/**
 * Friend card component props
 */
export interface FriendCardProps extends BaseProps {
  /** Friend data */
  friend: Friend;
  /** Click callback */
  onClick?: () => void;
  /** Invite callback */
  onInvite?: () => void;
  /** Remove callback */
  onRemove?: () => void;
  /** Show actions */
  showActions?: boolean;
}

// ============================================================================
// MAP EDITOR COMPONENT PROPS
// ============================================================================

/**
 * Map editor component props
 */
export interface MapEditorProps extends BaseProps {
  /** Initial map data (for editing) */
  initialMap?: GameMap;
  /** Save callback */
  onSave: (map: {
    name: string;
    description?: string;
    tiles: number[][];
    spawnPoints: Position[];
    width: number;
    height: number;
  }) => Promise<void>;
  /** Cancel callback */
  onCancel: () => void;
}

/**
 * Tile palette component props
 */
export interface TilePaletteProps extends BaseProps {
  /** Selected tile type */
  selectedTile: number;
  /** Tile selection callback */
  onSelectTile: (tileType: number) => void;
  /** Selected tool */
  selectedTool: 'paint' | 'fill' | 'erase' | 'spawn';
  /** Tool selection callback */
  onSelectTool: (tool: 'paint' | 'fill' | 'erase' | 'spawn') => void;
}

/**
 * Map preview component props
 */
export interface MapPreviewProps extends BaseProps {
  /** Map data */
  map: GameMap | MapListItem;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Click callback */
  onClick?: () => void;
  /** Show info overlay */
  showInfo?: boolean;
}

// ============================================================================
// LAYOUT COMPONENT PROPS
// ============================================================================

/**
 * Page layout component props
 */
export interface PageLayoutProps extends BaseProps, WithChildren {
  /** Page title */
  title?: string;
  /** Show navbar */
  showNavbar?: boolean;
  /** Show footer */
  showFooter?: boolean;
  /** Max content width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Navbar component props
 */
export interface NavbarProps extends BaseProps {
  /** Current user profile */
  user?: Profile | null;
  /** Sign out callback */
  onSignOut?: () => void;
  /** Show notifications */
  showNotifications?: boolean;
  /** Notification count */
  notificationCount?: number;
}

/**
 * Sidebar component props
 */
export interface SidebarProps extends BaseProps {
  /** Whether sidebar is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Navigation items */
  items: Array<{
    id: string;
    label: string;
    href: string;
    icon?: ReactNode;
    badge?: number;
  }>;
  /** Active item ID */
  activeItemId?: string;
}
