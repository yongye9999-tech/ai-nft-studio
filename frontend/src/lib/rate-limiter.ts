/**
 * In-memory, per-IP rate limiter for Next.js API routes.
 *
 * Configuration (via environment variables):
 *   RATE_LIMIT_WINDOW_MS       – Rolling window in milliseconds (default: 60 000 = 1 min)
 *   RATE_LIMIT_MAX_REQUESTS    – Max requests per IP per window (default: 10)
 *   RATE_LIMIT_DAILY_MAX       – Max requests per IP per calendar day (default: 50)
 *
 * Usage:
 *   const { success, retryAfter } = checkRateLimit(request)
 *   if (!success) return NextResponse.json({ error: '...' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */

import { NextRequest } from 'next/server'

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 10)
const DAILY_MAX = Number(process.env.RATE_LIMIT_DAILY_MAX ?? 50)

interface WindowEntry {
  timestamps: number[]
  dailyCount: number
  dailyDate: string   // "YYYY-MM-DD" in UTC
}

// Module-level map — persists for the lifetime of the Node.js process (single instance).
// For multi-instance / edge deployments, replace with a Redis-backed store.
const store = new Map<string, WindowEntry>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Returns the best available client IP from the request.
 */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export interface RateLimitResult {
  success: boolean
  /** Seconds to wait before retrying (only set when success is false). */
  retryAfter?: number
}

/**
 * Checks whether the request is within rate limits.
 * Mutates the in-memory store on each call.
 */
export function checkRateLimit(req: NextRequest): RateLimitResult {
  const ip = getClientIP(req)
  const now = Date.now()
  const today = todayUTC()

  let entry = store.get(ip)

  // Initialise or reset daily counter at midnight
  if (!entry || entry.dailyDate !== today) {
    entry = { timestamps: [], dailyCount: 0, dailyDate: today }
  }

  // Evict timestamps outside the rolling window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)

  // Daily limit check
  if (entry.dailyCount >= DAILY_MAX) {
    store.set(ip, entry)
    // Retry at next midnight UTC
    const midnight = new Date()
    midnight.setUTCDate(midnight.getUTCDate() + 1)
    midnight.setUTCHours(0, 0, 0, 0)
    return { success: false, retryAfter: Math.ceil((midnight.getTime() - now) / 1000) }
  }

  // Per-window limit check
  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0]
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000)
    store.set(ip, entry)
    return { success: false, retryAfter }
  }

  // Allow — record this request
  entry.timestamps.push(now)
  entry.dailyCount += 1
  store.set(ip, entry)
  return { success: true }
}
