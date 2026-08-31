#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Aletheia L1 setup"
echo

if ! command -v compact >/dev/null 2>&1; then
  echo "ERROR: compact not found. Install from https://docs.midnight.network"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found"
  exit 1
fi

echo "==> Ensuring Compact compiler 0.31.1"
compact update 0.31.1

echo
echo "==> Installing dependencies"
yarn install

echo
echo "==> Compiling contract"
yarn compile

echo
echo "==> Starting local node + indexer"
docker compose up -d --wait node indexer

if curl -sf http://127.0.0.1:6300/health >/dev/null 2>&1 || nc -z 127.0.0.1 6300 2>/dev/null; then
  echo "==> Proof server already listening on :6300 (skipping container)"
else
  echo "==> Starting proof server on :6300"
  docker compose up -d --wait proof-server || {
    echo "WARN: proof-server container failed (port 6300 may be in use)."
    echo "      Ensure midnightntwrk/proof-server:8.0.3 is reachable at http://127.0.0.1:6300"
  }
fi

echo
echo "==> Running tests"
yarn test:local

echo
echo "==> L1 verify complete"
echo "    Optional: yarn deploy (uses genesis wallet on undeployed)"
