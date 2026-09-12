"""
Production Security & Guard Layer

- Origin verification: verifies request Origin header on state-mutating requests.
- Rate limiting: in-memory sliding window bucketed per client IP.
  - Payload limits: REST 512 KB, WebSocket messages 64 KB.
  - Task validation: enforces locations, non-charger waypoints, and task type rules.
"""
from __future__ import annotations

import os
import re
import time
from collections import defaultdict, deque
from typing import Deque

MAX_BODY_BYTES = 512 * 1024
MAX_WS_MESSAGE_BYTES = 64 * 1024

LIMITS: dict[str, tuple[int, float]] = {   # bucket → (max calls, window seconds)
    "mutate": (20, 60.0),
    "ai": (10, 60.0),
    "whatif": (4, 60.0),
    "ws": (120, 60.0),
}


def rate_limit_enabled() -> bool:
    return os.environ.get("TWIN_RATE_LIMIT", "1") != "0"


class RateLimiter:
    GC_EVERY = 500   # Garbage collection interval to purge expired rate limiter entries

    def __init__(self) -> None:
        self._hits: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._calls = 0

    def _gc(self, now: float) -> None:
        dead = [k for k, q in self._hits.items() if not q or now - q[-1] > LIMITS[k[0]][1]]
        for k in dead:
            del self._hits[k]

    def check(self, bucket: str, key: str) -> tuple[bool, float]:
        """Returns tuple of (allowed: bool, retry_after_seconds: float)."""
        if not rate_limit_enabled():
            return True, 0.0
        limit, window = LIMITS[bucket]
        now = time.monotonic()
        self._calls += 1
        if self._calls % self.GC_EVERY == 0:
            self._gc(now)
        q = self._hits[(bucket, key)]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return False, round(window - (now - q[0]), 1) if q else window
        q.append(now)
        return True, 0.0

    def reset(self) -> None:
        self._hits.clear()


limiter = RateLimiter()


def client_key(headers: dict[str, str] | None, host: str | None) -> str:
    """Extract trusted client IP from X-Forwarded-For header using proxy depth."""
    h = {k.lower(): v for k, v in (headers or {}).items()}
    n = int(os.environ.get("TWIN_TRUSTED_PROXIES", "1"))
    xff = h.get("x-forwarded-for")
    if xff and n > 0:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-n] if len(parts) >= n else parts[0]
    return host or "unknown"


def _allowed_origins() -> tuple[list[str], re.Pattern[str] | None, bool]:
    raw = os.environ.get("TWIN_CORS_ORIGINS", "*")
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    regex = os.environ.get("TWIN_CORS_REGEX") or None
    open_ = "*" in origins and not regex
    return origins, re.compile(regex) if regex else None, open_


def origin_allowed(origin: str | None) -> bool:
    origins, regex, open_ = _allowed_origins()
    if open_:
        return True
    if not origin:
        return os.environ.get("TWIN_ALLOW_NO_ORIGIN", "0") == "1"
    o = origin.rstrip("/")
    if o in origins:
        return True
    return bool(regex and regex.fullmatch(o))
