#!/bin/bash

# Script de deploy do frontend
set -e  # Parar em caso de erro

echo "🔄 Atualizando código do Git..."
cd /root/Sys-Ticket
git pull

echo "📦 Instalando dependências..."
cd apps/frontend
npm install

echo "🏗️  Compilando frontend..."
npm run build

echo "📂 Copiando para pasta do Nginx..."
sudo rm -rf /var/www/sys-ticket/*
sudo cp -r dist/* /var/www/sys-ticket/

echo "🔄 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deploy concluído!"
echo "Frontend atualizado em: /var/www/sys-ticket/"
echo ""
echo "🌐 Acesse: https://172.31.255.26"
echo ""
echo "💡 Dica: Faça Ctrl+F5 para limpar o cache do navegador"
