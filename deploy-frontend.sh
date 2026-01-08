#!/bin/bash

# Script de deploy do frontend
cd /root/Sys-Ticket/apps/frontend

echo "🔄 Atualizando código do Git..."
git pull

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Compilando frontend..."
npm run build

echo "✅ Deploy concluído!"
echo "Frontend atualizado em: /root/Sys-Ticket/apps/frontend/dist"
