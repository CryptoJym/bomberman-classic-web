/**
 * Utility Types for Bomberman Online
 * Common utility types used throughout the codebase
 */

// ============================================================================
// BASIC UTILITY TYPES
// ============================================================================

/**
 * Make a type nullable (T or null)
 */
export type Nullable<T> = T | null;

/**
 * Make a type optional (T or undefined)
 */
export type Optional<T> = T | undefined;

/**
 * Make a type nullable and optional
 */
export type Maybe<T> = T | null | undefined;

/**
 * Make all properties of T nullable
 */
export type NullableProps<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Make all properties of T optional and nullable
 */
export type MaybeProps<T> = {
  [P in keyof T]?: T[P] | null;
};

// ============================================================================
// ASYNC STATE TYPES
// ============================================================================

/**
 * Async state for data fetching
 */
export interface AsyncState<T> {
  /** Data if loaded successfully */
  data: T | null;
  /** Whether currently loading */
  loading: boolean;
  /** Error if failed */
  error: Error | null;
}

/**
 * Initial async state
 */
export const initialAsyncState = <T>(): AsyncState<T> => ({
  data: null,
  loading: false,
  error: null,
});

/**
 * Loading async state
 */
export const loadingAsyncState = <T>(currentData?: T | null): AsyncState<T> => ({
  data: currentData ?? null,
  loading: true,
  error: null,
});

/**
 * Success async state
 */
export const successAsyncState = <T>(data: T): AsyncState<T> => ({
  data,
  loading: false,
  error: null,
});

/**
 * Error async state
 */
export const errorAsyncState = <T>(error: Error): AsyncState<T> => ({
  data: null,
  loading: false,
  error,
});

/**
 * Extended async state with more status info
 */
export interface AsyncStateExtended<T> extends AsyncState<T> {
  /** Whether data has been fetched at least once */
  isInitialized: boolean;
  /** Whether currently refetching (has data but loading) */
  isRefetching: boolean;
  /** Timestamp of last successful fetch */
  lastFetchedAt: number | null;
}

/**
 * Async action state (for mutations)
 */
export interface AsyncActionState {
  /** Whether action is in progress */
  loading: boolean;
  /** Error if failed */
  error: Error | null;
  /** Whether action succeeded */
  success: boolean;
}

// ============================================================================
// RESULT TYPES (Rust-style)
// ============================================================================

/**
 * Success result
 */
export interface Ok<T> {
  ok: true;
  value: T;
}

/**
 * Error result
 */
export interface Err<E> {
  ok: false;
  error: E;
}

/**
 * Result type (Rust-style)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Create an Ok result
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Create an Err result
 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Check if result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/**
 * Check if result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/**
 * Unwrap result or throw error
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) return result.value;
  throw result.error;
};

/**
 * Unwrap result or return default
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return isOk(result) ? result.value : defaultValue;
};

// ============================================================================
// OBJECT UTILITY TYPES
// ============================================================================

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific keys nullable
 */
export type NullableKeys<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * Omit keys with specific value type
 */
export type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

/**
 * Pick keys with specific value type
 */
export type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

/**
 * Get keys of T that have value type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Deep partial - make all nested properties optional
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep required - make all nested properties required
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Deep readonly - make all nested properties readonly
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * Mutable version of a readonly type
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep mutable - remove readonly from all nested properties
 */
export type DeepMutable<T> = T extends object
  ? {
      -readonly [P in keyof T]: DeepMutable<T[P]>;
    }
  : T;

// ============================================================================
// ARRAY UTILITY TYPES
// ============================================================================

/**
 * Get element type of an array
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Tuple to union type
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

/**
 * Create a tuple type of length N with element type T
 */
export type Tuple<T, N extends number, R extends T[] = []> = R['length'] extends N
  ? R
  : Tuple<T, N, [T, ...R]>;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Array with at least N elements
 */
export type AtLeast<T, N extends number, R extends T[] = []> = R['length'] extends N
  ? [...R, ...T[]]
  : AtLeast<T, N, [T, ...R]>;

// ============================================================================
// STRING UTILITY TYPES
// ============================================================================

/**
 * String literal union from object keys
 */
export type StringKeys<T> = Extract<keyof T, string>;

/**
 * Capitalize first letter
 */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * Convert to snake_case (simple)
 */
export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
  : S;

/**
 * Non-empty string type
 */
export type NonEmptyString = string & { readonly __brand: unique symbol };

// ============================================================================
// FUNCTION UTILITY TYPES
// ============================================================================

/**
 * Extract return type of async function
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

/**
 * Extract parameters of a function
 */
export type Parameters<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Function with no arguments
 */
export type NoArgsFn<R = void> = () => R;

/**
 * Callback function type
 */
export type Callback<T = void> = (result: T) => void;

/**
 * Error callback type
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Debounced function type
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Throttled function type
 */
export interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
}

// ============================================================================
// BRANDED/NOMINAL TYPES
// ============================================================================

/**
 * Brand a type to create a nominal type
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Branded string types for type safety
 */
export type UUID = Brand<string, 'UUID'>;
export type ClerkId = Brand<string, 'ClerkId'>;
export type RoomCode = Brand<string, 'RoomCode'>;
export type Timestamp = Brand<number, 'Timestamp'>;
export type PositiveNumber = Brand<number, 'PositiveNumber'>;
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Create a UUID (runtime helper)
 */
export const asUUID = (id: string): UUID => id as UUID;

/**
 * Create a ClerkId (runtime helper)
 */
export const asClerkId = (id: string): ClerkId => id as ClerkId;

/**
 * Create a RoomCode (runtime helper)
 */
export const asRoomCode = (code: string): RoomCode => code as RoomCode;

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event handler type
 */
export type EventHandler<E = Event> = (event: E) => void;

/**
 * Event emitter listener
 */
export type EventListener<T = unknown> = (data: T) => void;

/**
 * Event map type for typed event emitters
 */
export type EventMap = Record<string, unknown>;

/**
 * Typed event emitter interface
 */
export interface TypedEventEmitter<T extends EventMap> {
  on<K extends keyof T>(event: K, listener: EventListener<T[K]>): void;
  off<K extends keyof T>(event: K, listener: EventListener<T[K]>): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result
 */
export type ValidationResult<T> = Result<T, ValidationError[]>;

/**
 * Validator function type
 */
export type Validator<T> = (value: unknown) => ValidationResult<T>;

// ============================================================================
// COMPARISON TYPES
// ============================================================================

/**
 * Comparison result
 */
export type CompareResult = -1 | 0 | 1;

/**
 * Comparator function
 */
export type Comparator<T> = (a: T, b: T) => CompareResult;

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort config
 */
export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

// ============================================================================
// TIME TYPES
// ============================================================================

/**
 * Duration in milliseconds
 */
export type DurationMs = Brand<number, 'DurationMs'>;

/**
 * Unix timestamp in seconds
 */
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

/**
 * ISO date string
 */
export type ISODateString = Brand<string, 'ISODateString'>;

/**
 * Time range
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// NETWORKING TYPES
// ============================================================================

/**
 * HTTP method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP status codes
 */
export type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500 | 502 | 503;

/**
 * Request options
 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
}

/**
 * Assert a condition is true
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

/**
 * Exhaustive check helper for switch statements
 */
export function exhaustiveCheck(value: never, message?: string): never {
  throw new Error(message ?? `Unhandled case: ${JSON.stringify(value)}`);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an object (not null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return value.length > 0;
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
