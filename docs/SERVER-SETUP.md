# 🖥️ Preparação do Servidor - Ubuntu 22.04

Guia completo para preparar seu servidor Ubuntu 22.04 para rodar o Sys-Ticket em produção.

---

## 📋 Índice

- [Informações do Servidor](#informações-do-servidor)
- [1. Atualização do Sistema](#1-atualização-do-sistema)
- [2. Instalação do Node.js](#2-instalação-do-nodejs)
- [3. Instalação do PostgreSQL](#3-instalação-do-postgresql)
- [4. Instalação do Redis](#4-instalação-do-redis)
- [5. Instalação do Docker (Opcional)](#5-instalação-do-docker-opcional)
- [6. Nginx como Reverse Proxy](#6-nginx-como-reverse-proxy)
- [7. Firewall (UFW)](#7-firewall-ufw)
- [8. SSL/TLS com Let's Encrypt](#8-ssltls-com-lets-encrypt)
- [9. PM2 para Gerenciamento de Processos](#9-pm2-para-gerenciamento-de-processos)
- [10. Deploy da Aplicação](#10-deploy-da-aplicação)
- [11. Monitoramento e Logs](#11-monitoramento-e-logs)
- [12. Backup Automático](#12-backup-automático)

---

## 📊 Informações do Servidor

**Sistema**: Ubuntu 22.04 LTS
**Requisitos Mínimos**:
- CPU: 2 cores
- RAM: 4GB
- Disco: 40GB SSD
- Acesso root ou sudo

**Portas Necessárias**:
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH)
- 3000 (Backend - interno)
- 5432 (PostgreSQL - interno)
- 6379 (Redis - interno)

---

## 1. Atualização do Sistema

```bash
# Conectar ao servidor via SSH
ssh root@seu-servidor-ip

# Atualizar lista de pacotes
sudo apt update

# Atualizar todos os pacotes
sudo apt upgrade -y

# Instalar pacotes essenciais
sudo apt install -y curl wget git vim build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Configurar timezone (ajuste conforme sua região)
sudo timedatectl set-timezone America/Sao_Paulo

# Verificar timezone
timedatectl
```

---

## 2. Instalação do Node.js

```bash
# Instalar Node.js 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

sudo apt install -y nodejs

# Verificar instalação
node --version   # deve mostrar v20.x.x
npm --version    # deve mostrar v10.x.x

# Instalar pnpm (opcional, mais rápido que npm)
sudo npm install -g pnpm

# Verificar
pnpm --version
```

---

## 3. Instalação do PostgreSQL

```bash
# Instalar PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

sudo apt update

sudo apt install -y postgresql-16 postgresql-contrib-16

# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql

# Configurar PostgreSQL
sudo -u postgres psql << EOF
-- Criar usuário
CREATE USER sys_ticket WITH PASSWORD 'SUA_SENHA_FORTE_AQUI';

-- Criar banco de dados
CREATE DATABASE sys_ticket_db OWNER sys_ticket;

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE sys_ticket_db TO sys_ticket;

-- Habilitar extensões
\c sys_ticket_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Sair
\q
EOF

# Configurar acesso remoto (se necessário)
# Editar postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
# Procurar e alterar:
# listen_addresses = 'localhost'  # para '*' se precisar acesso remoto

# Editar pg_hba.conf para permitir conexões
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Adicionar no final:
# host    sys_ticket_db    sys_ticket    127.0.0.1/32    md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Testar conexão
psql -U sys_ticket -d sys_ticket_db -h localhost
# Digite a senha quando solicitado
# \q para sair
```

---

## 4. Instalação do Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo nano /etc/redis/redis.conf

# Procurar e alterar estas linhas:
# supervised no  →  supervised systemd
# bind 127.0.0.1  (manter como está - apenas localhost)
# maxmemory 256mb  (adicionar esta linha)
# maxmemory-policy allkeys-lru  (adicionar esta linha)

# Reiniciar Redis
sudo systemctl restart redis-server

# Habilitar Redis no boot
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server

# Testar Redis
redis-cli ping
# Deve retornar: PONG
```

---

## 5. Instalação do Docker (Opcional)

**Use Docker se preferir containerizar a aplicação**

```bash
# Remover versões antigas (se houver)
sudo apt remove docker docker-engine docker.io containerd runc

# Instalar dependências
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Adicionar chave GPG oficial do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Adicionar repositório do Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalação
sudo docker --version
sudo docker compose version

# Adicionar seu usuário ao grupo docker (para não precisar de sudo)
sudo usermod -aG docker $USER

# Aplicar mudanças (ou faça logout/login)
newgrp docker

# Testar Docker
docker run hello-world

# Iniciar e habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 6. Nginx como Reverse Proxy

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração para o Sys-Ticket
sudo nano /etc/nginx/sites-available/sys-ticket

# Cole esta configuração (ajuste seu-dominio.com):
```

```nginx
# /etc/nginx/sites-available/sys-ticket

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Temporariamente permitir HTTP para certificado SSL
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Depois que o SSL estiver configurado, descomente:
    # return 301 https://$server_name$request_uri;
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.seu-dominio.com;

    # Logs
    access_log /var/log/nginx/sys-ticket-api-access.log;
    error_log /var/log/nginx/sys-ticket-api-error.log;

    # SSL (será configurado depois com Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/api.seu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.seu-dominio.com/privkey.pem;

    # Configurações de segurança
    client_max_body_size 20M;

    # Proxy para backend Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Frontend Web
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # Logs
    access_log /var/log/nginx/sys-ticket-web-access.log;
    error_log /var/log/nginx/sys-ticket-web-error.log;

    # SSL (será configurado depois)
    # ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Diretório do frontend (build)
    root /var/www/sys-ticket/frontend;
    index index.html;

    # Configurações de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compressão gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

```bash
# Criar link simbólico para habilitar o site
sudo ln -s /etc/nginx/sites-available/sys-ticket /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# Habilitar Nginx no boot
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

---

## 7. Firewall (UFW)

```bash
# Instalar UFW (geralmente já vem instalado)
sudo apt install -y ufw

# Permitir SSH (IMPORTANTE: fazer antes de habilitar!)
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir Nginx
sudo ufw allow 'Nginx Full'

# Verificar regras antes de ativar
sudo ufw show added

# Habilitar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose

# Opcional: permitir PostgreSQL apenas de IP específico
# sudo ufw allow from SEU_IP_LOCAL to any port 5432
```

---

## 8. SSL/TLS com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL (substitua seu-dominio.com)
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com -d api.seu-dominio.com

# Durante o processo:
# - Digite seu email
# - Aceite os termos
# - Escolha se quer compartilhar email (opcional)
# - Escolha opção 2 (redirect) para forçar HTTPS

# Verificar renovação automática
sudo certbot renew --dry-run

# Renovação automática já está configurada via systemd timer
sudo systemctl status certbot.timer

# Certificados ficam em:
# /etc/letsencrypt/live/seu-dominio.com/
```

---

## 9. PM2 para Gerenciamento de Processos

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 --version

# PM2 será usado depois para rodar o backend
# Por enquanto, vamos configurar para iniciar no boot
sudo pm2 startup systemd -u $USER --hp /home/$USER

# Salvar configuração do PM2
pm2 save
```

---

## 10. Deploy da Aplicação

### 10.1. Criar Usuário para a Aplicação

```bash
# Criar usuário dedicado
sudo adduser --disabled-password --gecos "" sys-ticket

# Adicionar ao grupo www-data (Nginx)
sudo usermod -aG www-data sys-ticket

# Mudar para o usuário
sudo su - sys-ticket
```

### 10.2. Clonar Repositório

```bash
# Como usuário sys-ticket
cd ~

# Criar chave SSH para o GitHub (se usar repositório privado)
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
cat ~/.ssh/id_ed25519.pub
# Copie a chave e adicione no GitHub em Settings > SSH Keys

# Clonar repositório
git clone git@github.com:seu-usuario/sys-ticket.git
# OU se for público:
# git clone https://github.com/seu-usuario/sys-ticket.git

cd sys-ticket
```

### 10.3. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp apps/backend/.env.example apps/backend/.env

# Editar variáveis de ambiente
nano apps/backend/.env
```

```bash
# apps/backend/.env - CONFIGURAÇÃO DE PRODUÇÃO

# Application
NODE_ENV=production
PORT=3000
APP_NAME=Sys-Ticket API
APP_URL=https://api.seu-dominio.com

# CORS
CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=sys_ticket
DB_PASSWORD=SUA_SENHA_FORTE_AQUI
DB_DATABASE=sys_ticket_db
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT (GERE SENHAS FORTES!)
JWT_SECRET=GERE_UMA_CHAVE_SECRETA_FORTE_AQUI
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=GERE_OUTRA_CHAVE_SECRETA_DIFERENTE
JWT_REFRESH_EXPIRES_IN=7d

# SIGE Cloud API
SIGE_CLOUD_API_URL=https://api.sigecloud.com.br/v1
SIGE_CLOUD_API_KEY=sua_chave_sige_cloud
SIGE_CLOUD_API_SECRET=seu_secret_sige_cloud
SIGE_CLOUD_TIMEOUT=30000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/home/sys-ticket/uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-aplicativo
SMTP_FROM_NAME=Sys-Ticket
SMTP_FROM_EMAIL=noreply@seu-dominio.com

# Storage
STORAGE_TYPE=local
# Se usar S3:
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=warn
```

```bash
# Gerar senhas seguras para JWT
# Use este comando para gerar:
openssl rand -base64 64
# Execute duas vezes para JWT_SECRET e JWT_REFRESH_SECRET
```

### 10.4. Instalar Dependências e Build

```bash
# Como usuário sys-ticket, no diretório ~/sys-ticket

# Instalar dependências
npm install

# Build do backend
cd apps/backend
npm run build

# Voltar para raiz
cd ../..

# Build do frontend
cd apps/frontend
npm run build

# Criar diretório para servir frontend
sudo mkdir -p /var/www/sys-ticket/frontend
sudo cp -r dist/* /var/www/sys-ticket/frontend/
sudo chown -R www-data:www-data /var/www/sys-ticket

# Voltar para raiz
cd ../..
```

### 10.5. Executar Migrations

```bash
# Como usuário sys-ticket
cd ~/sys-ticket/apps/backend

# Executar migrations
npm run migration:run

# (Opcional) Executar seeds se tiver
npm run seed:run
```

### 10.6. Iniciar Aplicação com PM2

```bash
# Como usuário sys-ticket
cd ~/sys-ticket/apps/backend

# Iniciar backend com PM2
pm2 start dist/main.js --name sys-ticket-api \
  --instances 2 \
  --exec-mode cluster \
  --max-memory-restart 500M \
  --env production

# Verificar status
pm2 status

# Ver logs
pm2 logs sys-ticket-api

# Salvar configuração para reiniciar no boot
pm2 save

# Configurar PM2 para iniciar no boot (como root)
exit  # sair do usuário sys-ticket
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sys-ticket --hp /home/sys-ticket
```

### 10.7. Verificar Aplicação

```bash
# Testar backend localmente
curl http://localhost:3000/api

# Testar através do Nginx
curl https://api.seu-dominio.com/api

# Ver logs do Nginx
sudo tail -f /var/log/nginx/sys-ticket-api-access.log
sudo tail -f /var/log/nginx/sys-ticket-api-error.log

# Ver logs do PM2
pm2 logs sys-ticket-api
```

---

## 11. Monitoramento e Logs

### 11.1. Configurar Logrotate

```bash
# Criar configuração de logrotate para Nginx
sudo nano /etc/logrotate.d/sys-ticket
```

```
/var/log/nginx/sys-ticket-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 11.2. Monitoramento com PM2

```bash
# Instalar PM2 monitoring (opcional)
pm2 install pm2-logrotate

# Configurar rotação de logs
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitoramento em tempo real
pm2 monit
```

---

## 12. Backup Automático

### 12.1. Script de Backup do Banco

```bash
# Criar diretório de backups
sudo mkdir -p /backups/sys-ticket
sudo chown sys-ticket:sys-ticket /backups/sys-ticket

# Criar script de backup
sudo nano /home/sys-ticket/backup-db.sh
```

```bash
#!/bin/bash
# Script de backup do PostgreSQL

BACKUP_DIR="/backups/sys-ticket"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="sys_ticket_db_$DATE.sql.gz"

# Executar backup
pg_dump -U sys_ticket -h localhost sys_ticket_db | gzip > "$BACKUP_DIR/$FILENAME"

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "sys_ticket_db_*.sql.gz" -mtime +7 -delete

# Log
echo "$(date): Backup realizado: $FILENAME" >> /var/log/sys-ticket-backup.log
```

```bash
# Tornar executável
sudo chmod +x /home/sys-ticket/backup-db.sh

# Criar arquivo .pgpass para não pedir senha
echo "localhost:5432:sys_ticket_db:sys_ticket:SUA_SENHA_AQUI" > ~/.pgpass
chmod 600 ~/.pgpass

# Testar backup
/home/sys-ticket/backup-db.sh
ls -lh /backups/sys-ticket

# Agendar backup diário com cron
crontab -e

# Adicionar esta linha (backup às 2h da manhã):
0 2 * * * /home/sys-ticket/backup-db.sh
```

### 12.2. Backup de Arquivos

```bash
# Criar script de backup de arquivos
sudo nano /home/sys-ticket/backup-files.sh
```

```bash
#!/bin/bash
# Backup de uploads e configurações

BACKUP_DIR="/backups/sys-ticket"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="sys_ticket_files_$DATE.tar.gz"

# Backup de uploads e .env
tar -czf "$BACKUP_DIR/$FILENAME" \
  /home/sys-ticket/uploads \
  /home/sys-ticket/sys-ticket/apps/backend/.env

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "sys_ticket_files_*.tar.gz" -mtime +7 -delete

echo "$(date): Backup de arquivos realizado: $FILENAME" >> /var/log/sys-ticket-backup.log
```

```bash
# Tornar executável
sudo chmod +x /home/sys-ticket/backup-files.sh

# Adicionar ao cron (2:30 da manhã)
crontab -e
# Adicionar:
30 2 * * * /home/sys-ticket/backup-files.sh
```

---

## 📋 Checklist Final

```bash
# Verificar todos os serviços
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx
pm2 status

# Verificar firewall
sudo ufw status

# Verificar SSL
sudo certbot certificates

# Verificar logs
sudo tail -f /var/log/nginx/sys-ticket-api-access.log
pm2 logs sys-ticket-api --lines 50

# Testar aplicação
curl https://seu-dominio.com
curl https://api.seu-dominio.com/api
```

### ✅ Checklist de Verificação

- [ ] Sistema atualizado
- [ ] Node.js 20 instalado
- [ ] PostgreSQL 16 rodando
- [ ] Redis rodando
- [ ] Nginx configurado
- [ ] Firewall (UFW) ativo
- [ ] SSL configurado e funcionando
- [ ] Aplicação clonada
- [ ] Dependências instaladas
- [ ] Build realizado com sucesso
- [ ] Migrations executadas
- [ ] PM2 rodando a aplicação
- [ ] PM2 configurado para boot automático
- [ ] Logs funcionando
- [ ] Backup automático configurado
- [ ] Aplicação acessível via HTTPS

---

## 🔄 Comandos de Deploy/Update

### Deploy de Atualização

```bash
# Como usuário sys-ticket
cd ~/sys-ticket

# Pull das mudanças
git pull origin main

# Instalar novas dependências (se houver)
npm install

# Build do backend
cd apps/backend
npm run build

# Executar migrations (se houver novas)
npm run migration:run

# Build do frontend
cd ../frontend
npm run build
sudo cp -r dist/* /var/www/sys-ticket/frontend/

# Reiniciar backend
pm2 restart sys-ticket-api

# Verificar
pm2 status
pm2 logs sys-ticket-api --lines 20
```

### Rollback

```bash
# Como usuário sys-ticket
cd ~/sys-ticket

# Voltar para versão anterior
git log --oneline  # ver commits
git checkout HASH_DO_COMMIT_ANTERIOR

# Rebuild
cd apps/backend
npm run build

# Reverter migration (se necessário)
npm run migration:revert

# Reiniciar
pm2 restart sys-ticket-api
```

---

## 🆘 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs do PM2
pm2 logs sys-ticket-api --err

# Ver logs do sistema
sudo journalctl -u nginx -f

# Verificar se porta 3000 está em uso
sudo netstat -tulpn | grep :3000
```

### Erro de conexão com banco

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Testar conexão
psql -U sys_ticket -d sys_ticket_db -h localhost

# Ver logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### SSL não funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Ver logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Alto uso de memória

```bash
# Ver uso de recursos
pm2 monit
htop

# Limitar memória do PM2
pm2 delete sys-ticket-api
pm2 start dist/main.js --name sys-ticket-api --max-memory-restart 400M
pm2 save
```

---

## 📞 Recursos Adicionais

- **PostgreSQL**: `/var/log/postgresql/`
- **Nginx**: `/var/log/nginx/`
- **PM2**: `pm2 logs`
- **Certbot**: `/var/log/letsencrypt/`
- **Backups**: `/backups/sys-ticket/`

---

## 🎉 Servidor Configurado!

Seu servidor Ubuntu 22.04 está pronto para rodar o Sys-Ticket em produção!

**Acesse:**
- Frontend: https://seu-dominio.com
- API: https://api.seu-dominio.com/api
- Swagger: https://api.seu-dominio.com/api/docs

**Monitoramento:**
```bash
pm2 monit          # Monitoramento em tempo real
pm2 logs           # Logs da aplicação
sudo ufw status    # Status do firewall
```

Boa sorte! 🚀
