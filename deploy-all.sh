#!/bin/bash

# Script de deploy completo (backend + frontend)
set -e  # Parar em caso de erro

echo "========================================"
echo "🚀 DEPLOY COMPLETO - SYS-TICKET"
echo "========================================"
echo ""

echo "🔄 Atualizando código do Git..."
cd /root/Sys-Ticket
git pull
echo "✅ Git atualizado"
echo ""

echo "========================================"
echo "📦 BACKEND"
echo "========================================"
cd apps/backend
echo "📦 Instalando dependências..."
npm install
echo "🏗️  Compilando..."
npm run build
echo "🔄 Reiniciando PM2..."
pm2 restart backend
echo "✅ Backend atualizado"
echo ""

echo "========================================"
echo "🎨 FRONTEND"
echo "========================================"
cd ../frontend
echo "📦 Instalando dependências..."
npm install
echo "🏗️  Compilando..."
npm run build
echo "📂 Copiando para Nginx..."
sudo rm -rf /var/www/sys-ticket/*
sudo cp -r dist/* /var/www/sys-ticket/
echo "🔄 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Frontend atualizado"
echo ""

echo "========================================"
echo "✅ DEPLOY COMPLETO CONCLUÍDO!"
echo "========================================"
echo ""
echo "📊 Status do PM2:"
pm2 list
echo ""
echo "🌐 Acesse: https://172.31.255.26"
echo ""
echo "💡 Dica: Faça Ctrl+F5 para limpar o cache do navegador"
