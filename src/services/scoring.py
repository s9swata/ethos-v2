from __future__ import annotations

import difflib
from typing import Any

CATEGORY_BOOST: dict[str, int] = {
    "song": 15,
    "album": 5,
    "artist": 5,
    "playlist": 0,
}


def score_result(query: str, title: str, subtitle: str = "", category: str = "song") -> int:
    q = query.lower().strip()
    t = title.lower().strip()

    if not q or not t:
        return 0

    if q == t:
        text = 80
    elif t.startswith(q):
        text = 70
    elif q in t:
        text = 60
    else:
        text = max(0, int(difflib.SequenceMatcher(None, q, t).ratio() * 60))

    subtitle_bonus = 10 if subtitle and q in subtitle.lower() else 0
    boost = CATEGORY_BOOST.get(category, 0)

    return min(text + subtitle_bonus + boost, 100)


def rank_results(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(results, key=lambda r: r.get("score", 0), reverse=True)
