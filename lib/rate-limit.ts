// Lightweight in-memory rate limiter for local deployment
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60 * 1000): { success: boolean; remaining: number } {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: maxAttempts - 1 }
  }

  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0 }
  }

  record.count += 1
  return { success: true, remaining: maxAttempts - record.count }
}

export function resetRateLimit(key: string) {
  attempts.delete(key)
}
