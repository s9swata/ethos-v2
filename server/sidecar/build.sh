#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

TARGET_DIR="target"
BINARIES_DIR="../../src-tauri/binaries"

mkdir -p "$TARGET_DIR" "$BINARIES_DIR"

echo "=== Building ethos-server with PyInstaller ==="
/Library/Frameworks/Python.framework/Versions/3.12/bin/python3 -m PyInstaller ethos-server.spec --noconfirm --clean 2>&1

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

echo "=== Determining target triple ==="
TRIPLE=$(rustc -vV | grep host | cut -d' ' -f2)
echo "  → $TRIPLE"

echo "=== Copying to Tauri binaries ==="
cp dist/ethos-server "$BINARIES_DIR/ethos-server-$TRIPLE"
cp "$TARGET_DIR/yt-dlp" "$BINARIES_DIR/yt-dlp-$TRIPLE"
echo "  → $BINARIES_DIR/"
echo "Done"
