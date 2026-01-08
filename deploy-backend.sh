#!/bin/bash

# Script de deploy do backend
set -e  # Parar em caso de erro

echo "🔄 Atualizando código do Git..."
cd /root/Sys-Ticket
git pull

echo "📦 Instalando dependências..."
cd apps/backend
npm install

echo "🏗️  Compilando backend..."
npm run build

echo "🔄 Reiniciando PM2..."
pm2 restart backend

echo "✅ Deploy concluído!"
echo "Backend atualizado e reiniciado"
echo ""
echo "📊 Status do PM2:"
pm2 list
