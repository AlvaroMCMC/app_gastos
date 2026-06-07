#!/bin/bash
# =============================================================
# SETUP INICIAL en el Droplet (ejecutar solo la primera vez)
# =============================================================
set -e

REPO_URL="https://github.com/TU_USUARIO/app-gastos.git"  # <-- cambiar
INSTALL_DIR="/opt/apps/app-gastos"

echo "==> Instalando Docker y Docker Compose..."
apt-get update -qq
apt-get install -y docker.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "==> Clonando repositorio..."
git clone "$REPO_URL" "$INSTALL_DIR"

echo "==> Creando .env desde el ejemplo..."
cp "$INSTALL_DIR/deploy/.env.example" "$INSTALL_DIR/deploy/.env"

echo ""
echo "SIGUIENTE PASO:"
echo "  1. Edita $INSTALL_DIR/deploy/.env con los valores reales"
echo "  2. Ejecuta: bash $INSTALL_DIR/deploy/deploy.sh"
