from __future__ import annotations

import hashlib
import json
from functools import wraps
from pathlib import Path
from typing import Any, Callable

import diskcache

from src.config import settings

_cache: diskcache.Cache | None = None


def _get_cache() -> diskcache.Cache:
    global _cache
    if _cache is None:
        path = Path(settings.cache_dir) / "diskcache"
        path.mkdir(parents=True, exist_ok=True)
        _cache = diskcache.Cache(str(path), size_limit=500 * 1024 * 1024)
    return _cache


def _make_key(namespace: str, func_name: str, args: tuple, kwargs: dict) -> str:
    raw = f"{namespace}:{func_name}:{json.dumps((args, kwargs), sort_keys=True, default=str)}"
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_result(ttl: int, namespace: str = "default") -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache = _get_cache()
            key = _make_key(namespace, func.__name__, args, kwargs)
            cached = cache.get(key)
            if cached is not None:
                return cached
            result = await func(*args, **kwargs)
            cache.set(key, result, expire=ttl)
            return result
        return wrapper
    return decorator


def invalidate(pattern: str) -> None:
    cache = _get_cache()
    for key in cache:
        if pattern in key:
            del cache[key]
