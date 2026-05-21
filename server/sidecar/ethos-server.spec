# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path

OUTPUT = Path(".") / "target"

import importlib
try:
    _yt = importlib.import_module("ytmusicapi")
    YTAPI_LOCALES = Path(_yt.__file__).resolve().parent / "locales"
except Exception:
    YTAPI_LOCALES = Path(".") / "locales"
a = Analysis(
    ["server.py"],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        "ytmusicapi",
        "ytmusicapi.auth",
        "ytmusicapi.parsers",
        "ytmusicapi.mixins",
        "ytmusicapi.mixins.search",
        "ytmusicapi.mixins.artists",
        "ytmusicapi.mixins.albums",
        "ytmusicapi.mixins.browsing",
        "ytmusicapi.mixins.library",
        "ytmusicapi.mixins.uploads",
        "ytmusicapi.mixins.watch",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter", "matplotlib", "scipy", "pandas", "numpy",
        "PIL", "cv2", "tensorflow", "torch", "transformers",
        "notebook", "jupyter", "IPython", "setuptools", "pip",
        "werkzeug", "flask", "django", "uvicorn", "fastapi",
        "starlette", "anyio", "httptools", "websockets",
        "watchfiles", "python-multipart", "bcrypt", "passlib",
        "cryptography", "asyncio", "multiprocessing",
        "concurrent", "xml", "unittest", "pydoc",
    ],
    noarchive=False,
)

ytapi_datas = Tree(str(YTAPI_LOCALES), prefix="ytmusicapi/locales") if YTAPI_LOCALES.exists() else []
a.datas += ytapi_datas if isinstance(ytapi_datas, list) else []
a.datas += ytapi_datas

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="ethos-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
