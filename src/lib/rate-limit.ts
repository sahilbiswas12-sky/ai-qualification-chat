type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

const requests = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 8;

export function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const current = requests.get(identifier);

  if (!current || current.resetAt <= now) {
    requests.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      limit: REQUEST_LIMIT,
      remaining: REQUEST_LIMIT - 1,
      retryAfter: 0,
    };
  }

  if (current.count >= REQUEST_LIMIT) {
    return {
      allowed: false,
      limit: REQUEST_LIMIT,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    limit: REQUEST_LIMIT,
    remaining: REQUEST_LIMIT - current.count,
    retryAfter: 0,
  };
}
