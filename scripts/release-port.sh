#!/usr/bin/env bash
# Libera puertos necesarios para el proyecto
set -euo pipefail

PORTS=(80 443)

for port in "${PORTS[@]}"; do
  pid=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "Liberando puerto $port (PID $pid)..."
    kill -9 "$pid" 2>/dev/null || true
  else
    echo "Puerto $port libre"
  fi
done

echo "Puertos listos para docker compose up"
