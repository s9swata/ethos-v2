from __future__ import annotations

import re

from src.config import settings

SUSPICIOUS_RE = re.compile(r'[<>"\'`;$|&{}\\]+')


def validate_query(query: str) -> str | None:
    if not query or not query.strip():
        return "Query is required"
    if len(query) > settings.max_query_length:
        return f"Query exceeds {settings.max_query_length} characters"
    if SUSPICIOUS_RE.search(query):
        return "Query contains invalid characters"
    return None


def validate_track_id(track_id: str) -> str | None:
    if not track_id or not track_id.strip():
        return "Track ID is required"
    if len(track_id) > 100:
        return "Track ID too long"
    if SUSPICIOUS_RE.search(track_id):
        return "Track ID contains invalid characters"
    return None
