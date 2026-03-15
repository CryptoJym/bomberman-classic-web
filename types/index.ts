/**
 * Bomberman Online - Type Definitions
 *
 * Central export file for all TypeScript types.
 * Import from '@/types' or '@/types/<specific-file>'
 *
 * @module types
 */

// ============================================================================
// GAME TYPES
// Core game state, entities, and configuration
// ============================================================================

export type {
  // Basic types
  Position,
  PixelPosition,
  Direction,
  CardinalDirection,
  // Tile types
  TileType,
  TileVariant,
  Tile,
  // Powerup types
  PowerupType,
  SkullEffect,
  Powerup,
  // Player types
  PlayerColor,
  PlayerAnimationState,
  Player,
  PlayerSummary,
  // Bomb types
  BombState,
  Bomb,
  // Explosion types
  ExplosionSegmentType,
  ExplosionSegment,
  Explosion,
  // Map types
  SpawnPoint,
  GameMap,
  CompactMapData,
  // Game state types
  GamePhase,
  RoundResult,
  GameState,
  GameStateDelta,
  // Room types
  RoomVisibility,
  RoomSettings,
  RoomState,
  RoomListItem,
  // Input types
  InputAction,
  PlayerInput,
  InputResult,
} from './game';

export { DEFAULT_ROOM_SETTINGS, GAME_CONSTANTS, POWERUP_SPAWN_CHANCES } from './game';

// ============================================================================
// ASSET TYPES
// Sprites, animations, audio, and fonts
// ============================================================================

export type {
  // Core asset types
  SpriteSheet,
  AnimationConfig,
  SpriteRegion,
  // Character assets
  CharacterColor,
  CharacterAnimation,
  CharacterSpriteSheet,
  // Bomb assets
  BombAnimation,
  BombSpriteSheet,
  // Tile assets
  TileType as AssetTileType,
  TileSpriteSheet,
  // Powerup assets
  PowerupType as AssetPowerupType,
  PowerupItem,
  PowerupSpriteSheet,
  // Effect assets
  EffectAnimation,
  EffectsSpriteSheet,
  // UI assets
  UIElement,
  FontConfig,
  UISpriteSheet,
  // Audio assets
  MusicTrack,
  SoundEffect,
  AudioConfig,
  AudioManifest,
  // Font assets
  BitmapFontConfig,
  // Complete manifest
  AssetManifest,
  // Color palette types
  ColorPalette,
  CharacterPalette,
  MapThemeColors,
  PowerupColors,
  UIColors,
  ButtonColors,
  AchievementBorderColors,
  LegendaryBorderColors,
  ColorPaletteManifest,
  // Loading state
  AssetLoadingState,
  AssetLoadingProgress,
  // Placeholder types
  PlaceholderConfig,
  PlaceholderGeneratorOptions,
} from './assets';

// ============================================================================
// API TYPES
// REST API responses, leaderboards, achievements, tournaments
// ============================================================================

export type {
  // Pagination
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  // API responses
  ApiResponse,
  ApiError,
  ApiResult,
  // Profile types
  RankTier,
  Profile,
  OwnProfile,
  ProfileSettings,
  NotificationSettings,
  UpdateProfileRequest,
  // Leaderboard types
  LeaderboardTimeFilter,
  LeaderboardType,
  LeaderboardEntry,
  LeaderboardResponse,
  // Achievement types
  AchievementRarity,
  AchievementCategory,
  Achievement,
  AchievementCriteria,
  PlayerAchievement,
  AchievementUnlock,
  // Stats types
  PlayerStats,
  StatPeriod,
  // Game history types
  GameSummary,
  GameResult,
  PlayerGameResult,
  // Replay types
  ReplayMeta,
  ReplayData,
  ReplayFrame,
  ReplayEvent,
  // Tournament types
  TournamentFormat,
  TournamentStatus,
  Tournament,
  TournamentPrize,
  TournamentRequirements,
  TournamentBracket,
  TournamentMatch,
  TournamentParticipant,
  // Social types
  FriendshipStatus,
  Friend,
  FriendRequest,
  // Map types
  MapFilters,
  MapListItem,
  CreateMapRequest,
  // Notification types
  NotificationType,
  Notification,
  // Search types
  SearchResults,
} from './api';

// ============================================================================
// WEBSOCKET TYPES
// Client-server message protocol
// ============================================================================

export type {
  // Auth
  AuthPayload,
  // Client messages
  JoinRoomMessage,
  CreateRoomMessage,
  LeaveRoomMessage,
  MoveMessage,
  StopMessage,
  PlaceBombMessage,
  SpecialActionMessage,
  ReadyMessage,
  StartGameMessage,
  UpdateSettingsMessage,
  SelectMapMessage,
  KickPlayerMessage,
  TransferHostMessage,
  ChangeColorMessage,
  ChatMessage,
  PingMessage,
  RequestSyncMessage,
  SpectatePlayerMessage,
  RematchMessage,
  ReconnectMessage,
  ClientMessage,
  // Server messages
  ConnectedMessage,
  RoomJoinedMessage,
  RoomCreatedMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PlayerReadyMessage,
  SettingsUpdatedMessage,
  MapSelectedMessage,
  ColorChangedMessage,
  GameStartingMessage,
  GameStartMessage,
  StateUpdateMessage,
  FullStateSyncMessage,
  InputAckMessage,
  BombPlacedMessage,
  ExplosionMessage,
  PowerupCollectedMessage,
  PlayerDeathMessage,
  PlayerRespawnMessage,
  RoundEndMessage,
  RoundStartMessage,
  PhaseChangeMessage,
  SuddenDeathMessage,
  GameEndMessage,
  AchievementUnlockedMessage,
  ChatReceivedMessage,
  PongMessage,
  ErrorMessage,
  KickedMessage,
  RematchVoteMessage,
  SpectatorCountMessage,
  HostChangedMessage,
  ServerMessage,
  // Error codes
  ErrorCode,
  // Connection
  WebSocketEvent,
  WebSocketCloseCode,
  ConnectionState,
  ConnectionInfo,
} from './websocket';

export {
  isClientMessage,
  isServerMessage,
  isErrorMessage,
  isStateUpdateMessage,
  createClientMessage,
  createServerMessage,
  WS_CLOSE_CODES,
} from './websocket';

// ============================================================================
// DATABASE TYPES
// Supabase schema types
// ============================================================================

export type {
  // Row types
  ProfileRow,
  GameRow,
  GamePlayerRow,
  MapRow,
  AchievementRow,
  PlayerAchievementRow,
  ReplayRow,
  TournamentRow,
  TournamentParticipantRow,
  FriendshipRow,
  ChatMessageRow,
  MapLikeRow,
  PlayerStatsRow,
  // Insert types
  ProfileInsert,
  GameInsert,
  GamePlayerInsert,
  MapInsert,
  PlayerAchievementInsert,
  TournamentInsert,
  TournamentParticipantInsert,
  FriendshipInsert,
  ChatMessageInsert,
  MapLikeInsert,
  // Update types
  ProfileUpdate,
  GameUpdate,
  GamePlayerUpdate,
  MapUpdate,
  PlayerAchievementUpdate,
  TournamentUpdate,
  TournamentParticipantUpdate,
  FriendshipUpdate,
  // Enum types (database)
  GameStatus,
  TournamentParticipantStatus,
  ChatMessageType,
  StatsPeriodType,
  // JSON types
  GameSettingsJson,
  GameResultsJson,
  MapDataJson,
  AchievementCriteriaJson,
  TournamentPrizesJson,
  TournamentRequirementsJson,
  TournamentBracketJson,
  // Database schema
  Database,
  // Helper types
  TableRow,
  TableInsert,
  TableUpdate,
  TableName,
  ViewName,
  FunctionName,
} from './database';

// ============================================================================
// COMPONENT TYPES
// React component props
// ============================================================================

export type {
  // Base props
  BaseProps,
  WithChildren,
  Disableable,
  Loadable,
  // UI component props
  ButtonVariant,
  ButtonSize,
  ButtonProps,
  InputProps,
  ModalProps,
  CardProps,
  AvatarProps,
  BadgeProps,
  SpinnerProps,
  ToastProps,
  TabsProps,
  SelectProps,
  TooltipProps,
  // Game component props
  GameBoardProps,
  PlayerCharacterProps,
  PlayerHUDProps,
  GameTimerProps,
  ScoreboardProps,
  PowerupIndicatorProps,
  KillFeedProps,
  GameResultProps,
  // Lobby component props
  RoomBrowserProps,
  RoomLobbyProps,
  PlayerSlotProps,
  RoomSettingsProps,
  MapSelectorProps,
  ColorPickerProps,
  ChatProps,
  // Profile component props
  ProfileCardProps,
  StatsDisplayProps,
  RankBadgeProps,
  MatchHistoryProps,
  ProfileEditFormProps,
  // Leaderboard component props
  LeaderboardProps,
  LeaderboardEntryProps,
  // Achievement component props
  AchievementListProps,
  AchievementCardProps,
  AchievementToastProps,
  // Tournament component props
  TournamentListProps,
  TournamentBracketProps,
  TournamentMatchProps,
  // Social component props
  FriendsListProps,
  FriendCardProps,
  // Map editor component props
  MapEditorProps,
  TilePaletteProps,
  MapPreviewProps,
  // Layout component props
  PageLayoutProps,
  NavbarProps,
  SidebarProps,
} from './components';

// ============================================================================
// UTILITY TYPES
// Common utility types and helpers
// ============================================================================

export type {
  // Basic utilities
  Nullable,
  Optional,
  Maybe,
  NullableProps,
  MaybeProps,
  // Async state
  AsyncState,
  AsyncStateExtended,
  AsyncActionState,
  // Result types
  Ok,
  Err,
  Result,
  // Object utilities
  RequireKeys,
  OptionalKeys,
  NullableKeys,
  OmitByValue,
  PickByValue,
  KeysOfType,
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  Mutable,
  DeepMutable,
  // Array utilities
  ArrayElement,
  TupleToUnion,
  Tuple,
  NonEmptyArray,
  AtLeast,
  // String utilities
  StringKeys,
  Capitalize,
  SnakeCase,
  NonEmptyString,
  // Function utilities
  AsyncReturnType,
  NoArgsFn,
  Callback,
  ErrorCallback,
  DebouncedFunction,
  ThrottledFunction,
  // Branded types
  Brand,
  UUID,
  ClerkId,
  RoomCode,
  Timestamp,
  PositiveNumber,
  Percentage,
  // Event types
  EventHandler,
  EventListener,
  EventMap,
  TypedEventEmitter,
  // Validation types
  ValidationError,
  ValidationResult,
  Validator,
  // Comparison types
  CompareResult,
  Comparator,
  SortDirection,
  SortConfig,
  // Time types
  DurationMs,
  UnixTimestamp,
  ISODateString,
  TimeRange,
  // Network types
  HttpMethod,
  HttpStatusCode,
  RequestOptions,
} from './utils';

export {
  // Async state helpers
  initialAsyncState,
  loadingAsyncState,
  successAsyncState,
  errorAsyncState,
  // Result helpers
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  // Branded type helpers
  asUUID,
  asClerkId,
  asRoomCode,
  // Assertion helpers
  assertDefined,
  assert,
  exhaustiveCheck,
  // Type guards
  isDefined,
  isNullish,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNonEmptyArray,
  isFunction,
  isValidDate,
} from './utils';
