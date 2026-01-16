// Simple in-memory rate limiter for API routes
// Note: For production with multiple instances, use Redis instead

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data per IP/key
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (usually IP + route or gameId + route)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 * Handles common proxy headers
 */
export function getClientIP(request: Request): string {
  // Try common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback - in production this should be handled by your hosting provider
  return 'unknown';
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Game creation: 10 per minute per IP
  createGame: {
    windowMs: 60000,
    maxRequests: 10,
  },
  // Game actions: 60 per minute per game (1 per second average)
  gameAction: {
    windowMs: 60000,
    maxRequests: 60,
  },
  // Undo: 20 per minute per game
  gameUndo: {
    windowMs: 60000,
    maxRequests: 20,
  },
} as const;
