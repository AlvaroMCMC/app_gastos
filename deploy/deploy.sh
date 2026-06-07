#!/bin/bash
set -e

REPO_DIR="/opt/apps/app-gastos"
ENV_FILE="$REPO_DIR/deploy/.env"

cd "$REPO_DIR"

# Verificar que existe el .env
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: No existe $ENV_FILE"
    echo "Copia deploy/.env.example a deploy/.env y rellena los valores."
    exit 1
fi

echo "==> Pulling latest code..."
git pull origin master

echo "==> Building and starting containers..."
docker compose --env-file "$ENV_FILE" up -d --build

echo "==> Status:"
docker compose --env-file "$ENV_FILE" ps

echo ""
echo "Deploy completo. App corriendo en http://$(hostname -I | awk '{print $1}')"
