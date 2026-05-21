#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

VENV_DIR=".venv"
PLATFORM="$(uname -s)"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating venv..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
if [[ "$PLATFORM" =~ MINGW|CYGWIN|MSYS ]]; then
  source "$VENV_DIR/Scripts/activate"
fi

pip install --quiet --upgrade pip setuptools wheel
pip install --quiet -r requirements.txt

echo "Starting ethos-server on http://127.0.0.1:7860"
python3 server.py
