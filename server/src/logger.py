from __future__ import annotations

import logging
import sys

from src.config import settings


def get_logger(name: str = "ethos") -> logging.Logger:
    log = logging.getLogger(name)
    if not log.handlers:
        level = logging.DEBUG if settings.node_env != "production" else logging.INFO
        log.setLevel(level)
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        fmt = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(fmt)
        log.addHandler(handler)
    return log


logger = get_logger()
