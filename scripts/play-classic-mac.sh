#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-${GAME_SERVER_PORT:-8080}}"
URL="http://localhost:${PORT}"
HEALTHCHECK_URL="http://127.0.0.1:${PORT}"

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Using existing Bomberman server at ${URL}"
  open "$URL"
  exit 0
fi

echo "Starting Bomberman server at ${URL}"
node server/index.js &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

for _ in {1..50}; do
  if curl -fsS "$HEALTHCHECK_URL" >/dev/null 2>&1; then
    echo "Bomberman running at ${URL}"
    open "$URL"
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 0.2
done

echo "Bomberman server did not become ready at ${URL}" >&2
exit 1
