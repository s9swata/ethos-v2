# Cache Migration Plan: diskcache → Upstash Redis (async)

Replace all local caching (in-memory dict + diskcache SQLite) with Upstash Redis via `redis.asyncio.Redis`. Zero memory leak risk, cache survives restarts, no disk provisioning needed.

## Files to change

### 1. `server/pyproject.toml`
- Replace `"diskcache>=5.6"` with `"redis>=5.0"`

### 2. `server/src/config.py`
- Add: `redis_url: str = ""`

### 3. `server/src/services/cache.py` — rewrite from diskcache → `redis.asyncio.Redis`

```python
import json
import hashlib
from functools import wraps
from typing import Any, Callable

import redis.asyncio as redis

from src.config import settings

_redis: redis.Redis | None = None


def _get_cache() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _make_key(namespace: str, func_name: str, args: tuple, kwargs: dict) -> str:
    raw = f"{namespace}:{func_name}:{json.dumps((args, kwargs), sort_keys=True, default=str)}"
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_result(ttl: int, namespace: str = "default") -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache = _get_cache()
            key = _make_key(namespace, func.__name__, args, kwargs)
            cached = await cache.get(key)
            if cached is not None:
                return json.loads(cached)
            result = await func(*args, **kwargs)
            await cache.setex(key, ttl, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator


async def invalidate(pattern: str) -> None:
    cache = _get_cache()
    async for key in cache.scan_iter(match=pattern):
        await cache.delete(key)
```

### 4. `server/src/services/ytmusic.py` — replace `_personalized_cache`
- Remove `_personalized_cache`, `PERSONALIZED_CACHE_TTL`, `_PERSONALIZED_CACHE_MAXSIZE` constants
- Remove `import time` (no longer needed for cache timestamps)
- In `get_home_feed`, replace dict read/write with Redis calls via `_get_cache()` from `cache.py`
- Profile key already hashed via `_profile_key`, use `setex` with TTL 60

### 5. `server/Dockerfile`
- Replace `diskcache` → `redis` on line 14

### 6. `server/render.yaml`
- Add `- key: REDIS_URL` — value from Upstash (set via Render dashboard, not committed)
- Remove the `disk:` block (cache dir no longer needed)

### 7. `server/.env.example`
- Add `REDIS_URL=rediss://default:password@upstash-endpoint.upstash.io:6379`

## What stays the same
- All `@cache_result(ttl=..., namespace=...)` decorators keep their exact same arguments
- All function signatures remain unchanged
- `invalidate(pattern)` API preserved (now async)
- `_profile_key` hashing reused

## What goes away
- `diskcache` dependency
- `_personalized_cache` in-memory dict (and its manual eviction code)
- Persistent disk volume requirement from Render

## Operational notes
- Upstash free tier: 10k commands/day, 100 MB — sufficient for this workload
- Connection via `rediss://` (TLS), set `decode_responses=True` for string values
- If Redis is down, all cache ops gracefully return None → cache misses → API calls through (app still works, just slower)
- No retry/fallback logic needed at this layer — the app is functional without cache
