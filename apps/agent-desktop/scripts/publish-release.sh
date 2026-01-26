#!/bin/bash

# Script para publicar release do Agent Desktop
# Copia os arquivos gerados para a pasta latest e atualiza versions.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$AGENT_DIR/release"
LATEST_DIR="$RELEASE_DIR/latest"

# Obter versão do package.json
VERSION=$(node -p "require('$AGENT_DIR/package.json').version")

echo "=== Publicando Sys-Ticket Agent v$VERSION ==="

# Criar diretórios
mkdir -p "$RELEASE_DIR/$VERSION"
mkdir -p "$LATEST_DIR"

# Nome dos arquivos gerados pelo electron-builder
SETUP_FILE="Sys-Ticket Agent-Setup-$VERSION.exe"
PORTABLE_FILE="Sys-Ticket Agent-Portable-$VERSION.exe"

# Verificar se os arquivos existem
if [ ! -f "$RELEASE_DIR/$SETUP_FILE" ] && [ ! -f "$RELEASE_DIR/$PORTABLE_FILE" ]; then
    echo "ERRO: Nenhum arquivo .exe encontrado em $RELEASE_DIR"
    echo "Execute 'npm run build:win' primeiro."
    exit 1
fi

# Mover arquivos para diretório versionado
if [ -f "$RELEASE_DIR/$SETUP_FILE" ]; then
    echo "Movendo instalador para $RELEASE_DIR/$VERSION/"
    mv "$RELEASE_DIR/$SETUP_FILE" "$RELEASE_DIR/$VERSION/"
fi

if [ -f "$RELEASE_DIR/$PORTABLE_FILE" ]; then
    echo "Movendo portátil para $RELEASE_DIR/$VERSION/"
    mv "$RELEASE_DIR/$PORTABLE_FILE" "$RELEASE_DIR/$VERSION/"
fi

# Copiar para latest (com nomes padronizados)
if [ -f "$RELEASE_DIR/$VERSION/$SETUP_FILE" ]; then
    echo "Copiando instalador para latest/"
    cp "$RELEASE_DIR/$VERSION/$SETUP_FILE" "$LATEST_DIR/Sys-Ticket-Agent-Setup.exe"
fi

if [ -f "$RELEASE_DIR/$VERSION/$PORTABLE_FILE" ]; then
    echo "Copiando portátil para latest/"
    cp "$RELEASE_DIR/$VERSION/$PORTABLE_FILE" "$LATEST_DIR/Sys-Ticket-Agent-Portable.exe"
fi

# Atualizar versions.json
cat > "$RELEASE_DIR/versions.json" << EOF
{
  "latest": "$VERSION",
  "files": {
    "installer": "Sys-Ticket-Agent-Setup.exe",
    "portable": "Sys-Ticket-Agent-Portable.exe"
  },
  "updatedAt": "$(date -Iseconds)"
}
EOF

echo ""
echo "=== Release $VERSION publicada com sucesso! ==="
echo ""
echo "Arquivos disponíveis em:"
echo "  - $LATEST_DIR/Sys-Ticket-Agent-Setup.exe"
echo "  - $LATEST_DIR/Sys-Ticket-Agent-Portable.exe"
echo ""
echo "URLs de download:"
echo "  - https://172.31.255.26/api/v1/downloads/agent/installer"
echo "  - https://172.31.255.26/api/v1/downloads/agent/portable"
