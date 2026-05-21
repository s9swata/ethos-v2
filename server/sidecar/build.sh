#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

TARGET_DIR="target"
BINARIES_DIR="../../src-tauri/binaries"

mkdir -p "$TARGET_DIR" "$BINARIES_DIR"

echo "=== Building ethos-server with PyInstaller ==="
pyinstaller ethos-server.spec --noconfirm --clean > /dev/null 2>&1

BINARY="$TARGET_DIR/ethos-server"
if [ -f "$BINARY" ]; then
  echo "  → $BINARY ($(du -h "$BINARY" | cut -f1))"
fi

echo "=== Downloading yt-dlp binary ==="
UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

if [ "$UNAME_S" = "Darwin" ]; then
  if [ "$UNAME_M" = "arm64" ]; then
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
  else
    YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
  fi
elif [ "$UNAME_S" = "Linux" ]; then
  YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
elif [[ "$UNAME_S" =~ MINGW|CYGWIN|MSYS ]]; then
  YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
else
  echo "Unknown platform: $UNAME_S"
  exit 1
fi

curl -sL "$YTDLP_URL" -o "$TARGET_DIR/yt-dlp"
chmod +x "$TARGET_DIR/yt-dlp"
echo "  → $TARGET_DIR/yt-dlp ($(du -h "$TARGET_DIR/yt-dlp" | cut -f1))"

echo "=== Copying to Tauri binaries ==="
cp "$TARGET_DIR/ethos-server" "$TARGET_DIR/yt-dlp" "$BINARIES_DIR/"
echo "  → $BINARIES_DIR/"
echo "Done"
