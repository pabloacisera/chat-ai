#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# deploy-gcp.sh — Deploy completo a GCP Compute Engine
# Uso: ./scripts/deploy-gcp.sh <usuario> <ip_vm> [.env.produccion]
#   <usuario>       ej: kscod
#   <ip_vm>         ej: 35.184.XX.XX
#   .env.produccion opcional: archivo .env para producción
#     (si no se pasa, usa .env del proyecto)
# ─────────────────────────────────────────────

if [ $# -lt 2 ]; then
  echo "Uso: $0 <usuario> <ip_vm> [.env.produccion]"
  echo "  ej: $0 kscod 35.184.XX.XX"
  echo "  ej: $0 kscod 35.184.XX.XX .env.gcp"
  exit 1
fi

USUARIO="$1"
IP="$2"
ENV_FILE="${3:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== 1/4 — Empaquetando proyecto ==="
tar czf /tmp/chatai.tar.gz \
  docker-compose.yml \
  nginx/ \
  public/ \
  index.html \
  packages/api-express/Dockerfile \
  packages/api-express/entrypoint.sh \
  packages/api-express/package.json \
  packages/api-express/package-lock.json \
  packages/api-express/tsconfig.json \
  packages/api-express/src/ \
  packages/api-express/prisma/ \
  packages/api-express/data/ \
  "$ENV_FILE"

echo "=== 2/4 — Subiendo a VM ($IP) ==="
scp /tmp/chatai.tar.gz "$USUARIO@$IP":~
rm /tmp/chatai.tar.gz

echo "=== 3/4 — Instalando Docker + desplegando en VM ==="
ssh "$USUARIO@$IP" "
  set -e

  # Docker si no está
  if ! command -v docker &>/dev/null; then
    echo 'Instalando Docker...'
    sudo apt update && sudo apt install -y docker.io docker-compose-v2
    sudo systemctl enable --now docker
  fi

  # Preparar proyecto
  mkdir -p ~/chatAI
  tar xzf ~/chatai.tar.gz -C ~/chatAI
  cd ~/chatAI

  # Renombrar .env si viene con otro nombre
  if [ \"$ENV_FILE\" != '.env' ] && [ -f \"$ENV_FILE\" ]; then
    mv \"$ENV_FILE\" .env
  fi

  # Liberar puertos (si hay algo)
  if command -v lsof &>/dev/null; then
    sudo lsof -ti :80 -ti :443 2>/dev/null | xargs -r sudo kill -9 2>/dev/null || true
  fi

  # Levantar
  echo '=== 4/4 — docker compose up ==='
  docker compose up -d

  # Esperar a que el backend arranque
  echo 'Esperando health check...'
  for i in \$(seq 1 10); do
    if curl -sf http://localhost/health >/dev/null 2>&1; then
      echo '✅ Deploy exitoso — health check OK'
      exit 0
    fi
    echo \"Intento \$i/10...\"
    sleep 3
  done
  echo '❌ Health check falló después de 10 intentos'
  exit 1
"

echo "✅ Listo. http://$IP"
