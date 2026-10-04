"""In-memory sliding-window rate limiter per client key.

State is per process, so limits apply per instance. For multiple replicas,
use a shared store (e.g. Redis) or rate limit at the ingress.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0, max_keys: int = 50_000) -> None:
        self._limit = limit
        self._window = window_seconds
        self._max_keys = max_keys
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, now: float | None = None) -> tuple[bool, int]:
        """Records a request. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic() if now is None else now
        cutoff = now - self._window
        with self._lock:
            if len(self._hits) > self._max_keys:
                self._evict(cutoff)
            q = self._hits.setdefault(key, deque())
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= self._limit:
                return False, max(1, int(q[0] - cutoff) + 1)
            q.append(now)
            return True, 0

    def _evict(self, cutoff: float) -> None:
        for k in [k for k, q in self._hits.items() if not q or q[-1] <= cutoff]:
            del self._hits[k]
