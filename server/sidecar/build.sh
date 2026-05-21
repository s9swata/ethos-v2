#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

VENV_DIR=".venv"
TARGET_DIR="target"
BINARIES_DIR="../../src-tauri/binaries"
PLATFORM="$(uname -s)"
ARCH="$(uname -m)"

echo "=== Platform: $PLATFORM $ARCH ==="

# ── Python discovery ──────────────────────────────────────────────
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "Python 3 is required"
  exit 1
fi

# ── Virtual environment ───────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "=== Creating venv ==="
  $PYTHON -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
if [[ "$PLATFORM" =~ MINGW|CYGWIN|MSYS ]]; then
  source "$VENV_DIR/Scripts/activate"
fi

echo "=== Installing dependencies ==="
pip install --quiet --upgrade pip setuptools wheel
pip install --quiet pyinstaller ytmusicapi

# ── Build PyInstaller binary ──────────────────────────────────────
echo "=== Building ethos-server ==="
pyinstaller ethos-server.spec --noconfirm --clean 2>&1

BINARY="dist/ethos-server"
if [ "$PLATFORM" = "MINGW"* ] || [ "$PLATFORM" = "CYGWIN"* ] || [ "$PLATFORM" = "MSYS"* ]; then
  BINARY="dist/ethos-server.exe"
fi
echo "  → $BINARY ($(du -h "$BINARY" | cut -f1))"

# ── Determine target triple ───────────────────────────────────────
if command -v rustc &>/dev/null; then
  TRIPLE=$(rustc -vV | grep host | cut -d' ' -f2)
else
  case "$PLATFORM" in
    Darwin) TRIPLE="${ARCH}-apple-darwin" ;;
    Linux)  TRIPLE="${ARCH}-unknown-linux-gnu" ;;
    MINGW*|CYGWIN*|MSYS*) TRIPLE="${ARCH}-pc-windows-msvc" ;;
    *) echo "Unknown platform"; exit 1 ;;
  esac
fi
echo "  → Target triple: $TRIPLE"

# ── Download yt-dlp ───────────────────────────────────────────────
echo "=== Downloading yt-dlp ==="
case "$PLATFORM" in
  Darwin)
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    YTDLP_NAME="yt-dlp"
    ;;
  Linux)
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
    YTDLP_NAME="yt-dlp"
    ;;
  MINGW*|CYGWIN*|MSYS*)
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    YTDLP_NAME="yt-dlp.exe"
    ;;
esac

mkdir -p "$TARGET_DIR"
curl -sL "$YTDLP_URL" -o "$TARGET_DIR/$YTDLP_NAME"
chmod +x "$TARGET_DIR/$YTDLP_NAME"
echo "  → $TARGET_DIR/$YTDLP_NAME ($(du -h "$TARGET_DIR/$YTDLP_NAME" | cut -f1))"

# ── Copy to Tauri binaries ────────────────────────────────────────
echo "=== Copying to Tauri binaries ==="
mkdir -p "$BINARIES_DIR"
cp "$BINARY" "$BINARIES_DIR/ethos-server-$TRIPLE"
cp "$TARGET_DIR/$YTDLP_NAME" "$BINARIES_DIR/yt-dlp-$TRIPLE"
chmod +x "$BINARIES_DIR/ethos-server-$TRIPLE" "$BINARIES_DIR/yt-dlp-$TRIPLE"
echo "  → $BINARIES_DIR/"
echo "Done"
