/**
 * Authentication Middleware for Bomberman Game Server
 * Handles Clerk JWT verification and rate limiting
 */

import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import type { TokenBucket, ErrorCode } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthPayload {
  /** Clerk user ID */
  sub: string;
  /** Session ID */
  sid?: string;
  /** Username */
  username?: string;
  /** Email */
  email?: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Issuer */
  iss?: string;
}

export interface AuthResult {
  success: boolean;
  clerkId?: string;
  username?: string;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  retryAfterMs?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RATE_LIMITS = {
  move: { maxTokens: 60, refillRate: 60 },    // 60 per second
  bomb: { maxTokens: 10, refillRate: 10 },     // 10 per second
  chat: { maxTokens: 5, refillRate: 5 },       // 5 per second
  ping: { maxTokens: 2, refillRate: 2 },       // 2 per second
  default: { maxTokens: 30, refillRate: 30 },  // 30 per second
} as const;

const CONNECTION_RATE_LIMIT = {
  maxConnections: 5,
  windowMs: 60000, // 1 minute
} as const;

// Track connections per IP
const ipConnections = new Map<string, { count: number; firstConnection: number }>();

// ============================================================================
// JWT VERIFICATION
// ============================================================================

/**
 * Verify a Clerk JWT token
 * In production, this should verify against Clerk's JWKS endpoint
 */
export async function verifyClerkToken(token: string): Promise<AuthResult> {
  try {
    // In development, we can use a simple decode
    // In production, use @clerk/backend or jose library
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      console.warn('CLERK_SECRET_KEY not set - running in development mode');
      return verifyDevelopmentToken(token);
    }

    // Parse JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        success: false,
        error: { code: 1001 as ErrorCode, message: 'Invalid token format' },
      };
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    ) as AuthPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        success: false,
        error: { code: 1001 as ErrorCode, message: 'Token expired' },
      };
    }

    // Check issued at (not in the future)
    if (payload.iat && payload.iat > now + 60) {
      return {
        success: false,
        error: { code: 1001 as ErrorCode, message: 'Token issued in the future' },
      };
    }

    // In production, verify signature against Clerk JWKS
    // For now, accept if payload is valid structure
    if (!payload.sub) {
      return {
        success: false,
        error: { code: 1001 as ErrorCode, message: 'Missing user ID in token' },
      };
    }

    return {
      success: true,
      clerkId: payload.sub,
      username: payload.username || `Player_${payload.sub.slice(-6)}`,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: { code: 1001 as ErrorCode, message: 'Token verification failed' },
    };
  }
}

/**
 * Development mode token verification
 * Accepts a simple JSON token or generates anonymous user
 */
function verifyDevelopmentToken(token: string): AuthResult {
  try {
    // Try to parse as JSON for dev tokens
    if (token.startsWith('{')) {
      const devPayload = JSON.parse(token);
      return {
        success: true,
        clerkId: devPayload.id || `dev_${crypto.randomUUID()}`,
        username: devPayload.name || `DevPlayer_${Math.floor(Math.random() * 1000)}`,
      };
    }

    // Try to decode as base64 JWT-like token
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );
      return {
        success: true,
        clerkId: payload.sub || payload.id || `dev_${crypto.randomUUID()}`,
        username: payload.username || payload.name || `DevPlayer_${Math.floor(Math.random() * 1000)}`,
      };
    }

    // Generate anonymous user for completely invalid tokens in dev
    const anonId = `anon_${crypto.randomUUID()}`;
    return {
      success: true,
      clerkId: anonId,
      username: `Guest_${Math.floor(Math.random() * 10000)}`,
    };
  } catch {
    // Generate anonymous user on parse error in dev
    const anonId = `anon_${crypto.randomUUID()}`;
    return {
      success: true,
      clerkId: anonId,
      username: `Guest_${Math.floor(Math.random() * 10000)}`,
    };
  }
}

// ============================================================================
// CONNECTION AUTHENTICATION
// ============================================================================

/**
 * Extract and verify authentication from WebSocket upgrade request
 */
export async function authenticateConnection(
  request: IncomingMessage
): Promise<AuthResult> {
  // Extract token from query string
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const token = url.searchParams.get('token');

  if (!token) {
    // Allow anonymous connections in development
    if (process.env.NODE_ENV !== 'production') {
      const anonId = `anon_${crypto.randomUUID()}`;
      return {
        success: true,
        clerkId: anonId,
        username: `Guest_${Math.floor(Math.random() * 10000)}`,
      };
    }

    return {
      success: false,
      error: { code: 1002 as ErrorCode, message: 'Authentication required' },
    };
  }

  return verifyClerkToken(token);
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: IncomingMessage): string {
  // Check for forwarded headers (behind proxy)
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return request.socket.remoteAddress || '127.0.0.1';
}

/**
 * Check if IP can make new connection (rate limiting)
 */
export function checkConnectionRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const record = ipConnections.get(ip);

  if (!record) {
    ipConnections.set(ip, { count: 1, firstConnection: now });
    return { allowed: true, tokensRemaining: CONNECTION_RATE_LIMIT.maxConnections - 1 };
  }

  // Reset window if expired
  if (now - record.firstConnection > CONNECTION_RATE_LIMIT.windowMs) {
    ipConnections.set(ip, { count: 1, firstConnection: now });
    return { allowed: true, tokensRemaining: CONNECTION_RATE_LIMIT.maxConnections - 1 };
  }

  // Check limit
  if (record.count >= CONNECTION_RATE_LIMIT.maxConnections) {
    const retryAfterMs = CONNECTION_RATE_LIMIT.windowMs - (now - record.firstConnection);
    return { allowed: false, tokensRemaining: 0, retryAfterMs };
  }

  record.count++;
  return { allowed: true, tokensRemaining: CONNECTION_RATE_LIMIT.maxConnections - record.count };
}

/**
 * Record connection close (for IP tracking)
 */
export function recordConnectionClose(ip: string): void {
  const record = ipConnections.get(ip);
  if (record && record.count > 0) {
    record.count--;
    if (record.count === 0) {
      ipConnections.delete(ip);
    }
  }
}

// ============================================================================
// MESSAGE RATE LIMITING
// ============================================================================

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private buckets = new Map<string, Map<string, TokenBucket>>();

  /**
   * Check and consume a token for a message type
   */
  check(connectionId: string, messageType: string): RateLimitResult {
    const config = RATE_LIMITS[messageType as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
    const bucket = this.getOrCreateBucket(connectionId, messageType, config);

    // Refill tokens based on time elapsed
    this.refillBucket(bucket, config.refillRate);

    if (bucket.tokens < 1) {
      const tokensNeeded = 1 - bucket.tokens;
      const retryAfterMs = Math.ceil((tokensNeeded / config.refillRate) * 1000);
      return { allowed: false, tokensRemaining: 0, retryAfterMs };
    }

    bucket.tokens--;
    return { allowed: true, tokensRemaining: bucket.tokens };
  }

  /**
   * Remove all buckets for a connection
   */
  removeConnection(connectionId: string): void {
    this.buckets.delete(connectionId);
  }

  private getOrCreateBucket(
    connectionId: string,
    messageType: string,
    config: { maxTokens: number; refillRate: number }
  ): TokenBucket {
    let connectionBuckets = this.buckets.get(connectionId);
    if (!connectionBuckets) {
      connectionBuckets = new Map();
      this.buckets.set(connectionId, connectionBuckets);
    }

    let bucket = connectionBuckets.get(messageType);
    if (!bucket) {
      bucket = {
        tokens: config.maxTokens,
        maxTokens: config.maxTokens,
        refillRate: config.refillRate,
        lastRefill: Date.now(),
      };
      connectionBuckets.set(messageType, bucket);
    }

    return bucket;
  }

  private refillBucket(bucket: TokenBucket, refillRate: number): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * refillRate;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}

// ============================================================================
// RECONNECTION TOKENS
// ============================================================================

const RECONNECT_SECRET = process.env.RECONNECT_SECRET || 'bomberman_reconnect_dev_secret';
const RECONNECT_EXPIRY_MS = 30000; // 30 seconds

/**
 * Generate a reconnection token for a player
 */
export function generateReconnectToken(
  playerId: string,
  roomId: string,
  sessionId: string
): string {
  const expiresAt = Date.now() + RECONNECT_EXPIRY_MS;
  const payload = { playerId, roomId, sessionId, expiresAt };
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', RECONNECT_SECRET)
    .update(payloadStr)
    .digest('hex');

  const token = Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64url');
  return token;
}

/**
 * Verify and decode a reconnection token
 */
export function verifyReconnectToken(
  token: string
): { valid: boolean; playerId?: string; roomId?: string; sessionId?: string; error?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    const { playerId, roomId, sessionId, expiresAt, signature } = payload;

    // Check expiration
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify signature
    const payloadStr = JSON.stringify({ playerId, roomId, sessionId, expiresAt });
    const expectedSignature = crypto
      .createHmac('sha256', RECONNECT_SECRET)
      .update(payloadStr)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, playerId, roomId, sessionId };
  } catch {
    return { valid: false, error: 'Invalid token format' };
  }
}

// ============================================================================
// SINGLETON RATE LIMITER
// ============================================================================

export const rateLimiter = new RateLimiter();

// ============================================================================
// CLEANUP
// ============================================================================

// Periodically clean up stale IP connection records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipConnections.entries()) {
    if (now - record.firstConnection > CONNECTION_RATE_LIMIT.windowMs * 2) {
      ipConnections.delete(ip);
    }
  }
}, 60000); // Every minute
