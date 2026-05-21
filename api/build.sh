#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

VENV_DIR=".venv"
BINARIES_DIR="../src-tauri/binaries"
PLATFORM="$(uname -s)"

# ── Python discovery ──────────────────────────────────────────────
for c in "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3" \
  "python3.12" "python3.11" "python3" "python"; do
  if [ -x "$c" ] || (command -v "$c" &>/dev/null); then PYTHON="$c"; break; fi
done
[ -z "${PYTHON:-}" ] && { echo "Python 3 required"; exit 1; }
echo "  → $("$PYTHON" --version 2>&1)"

# ── Target triple ─────────────────────────────────────────────────
if command -v rustc &>/dev/null; then
  TRIPLE=$(rustc -vV | grep host | cut -d' ' -f2)
elif [ "$PLATFORM" = "Darwin" ]; then
  TRIPLE="$(uname -m)-apple-darwin"
elif [ "$PLATFORM" = "Linux" ]; then
  TRIPLE="$(uname -m)-unknown-linux-gnu"
else
  TRIPLE="x86_64-pc-windows-msvc"
fi
echo "  → Target: $TRIPLE"

# ── Venv ──────────────────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "=== Creating venv ==="
  "$PYTHON" -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
if [[ "$PLATFORM" =~ MINGW|CYGWIN|MSYS ]]; then
  source "$VENV_DIR/Scripts/activate"
fi

echo "=== Installing deps ==="
pip install --quiet --upgrade pip setuptools wheel
pip install --quiet pyinstaller fastapi uvicorn "yt-dlp" ytmusicapi pydantic

# ── Build ─────────────────────────────────────────────────────────
echo "=== Building sidecar-$TRIPLE ==="
pyinstaller main.py \
  --name "sidecar-$TRIPLE" \
  --onefile \
  --distpath "$BINARIES_DIR" \
  --clean --noconfirm \
  --collect-all yt_dlp \
  --collect-all ytmusicapi \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  --exclude-module tkinter \
  --exclude-module unittest \
  --exclude-module xmlrpc \
  --exclude-module pydoc \
  --exclude-module zipapp \
  --exclude-module venv \
  --exclude-module ensurepip \
  2>&1

BINARY="$BINARIES_DIR/sidecar-$TRIPLE"
if [ -f "$BINARY" ]; then
  echo "  → $BINARY ($(du -h "$BINARY" | cut -f1))"
else
  echo "  → Build failed: $BINARY not found"
  exit 1
fi

echo "=== Done ==="
