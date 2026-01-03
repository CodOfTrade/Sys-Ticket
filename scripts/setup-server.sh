#!/bin/bash

################################################################################
# Script de Configuração Automática do Servidor - Sys-Ticket
# Ubuntu 22.04 LTS
#
# Este script configura automaticamente todo o ambiente necessário
# Verifica o que já está instalado antes de instalar novamente
################################################################################

set -e  # Parar se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          SYS-TICKET - SETUP AUTOMÁTICO                    ║
║          Ubuntu 22.04 LTS                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se é root
if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
   log_error "Este script precisa de permissões sudo"
   exit 1
fi

log_info "Iniciando configuração do servidor..."
sleep 2

################################################################################
# CONFIGURAÇÕES (EDITE AQUI)
################################################################################

# Banco de Dados
DB_NAME="sys_ticket_db"
DB_USER="sys_ticket"
DB_PASSWORD="123321"  # ALTERE PARA PRODUÇÃO!

# Domínio (deixe em branco se não tiver ainda)
DOMAIN=""  # exemplo: seu-dominio.com
API_DOMAIN=""  # exemplo: api.seu-dominio.com

# Repositório Git
GIT_REPO=""  # exemplo: git@github.com:usuario/sys-ticket.git

# Email para SSL (Let's Encrypt)
ADMIN_EMAIL=""  # exemplo: admin@seu-dominio.com

################################################################################
# 1. ATUALIZAÇÃO DO SISTEMA
################################################################################

log_info "=== ETAPA 1: Atualização do Sistema ==="

if [ -f /var/run/reboot-required ]; then
    log_warning "Sistema requer reinicialização. Execute após instalar!"
fi

log_info "Atualizando lista de pacotes..."
sudo apt update -qq

log_info "Instalando pacotes essenciais..."
sudo apt install -y curl wget git vim build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release jq > /dev/null 2>&1

log_success "Sistema atualizado!"

################################################################################
# 2. NODE.JS
################################################################################

log_info "=== ETAPA 2: Node.js ==="

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_warning "Node.js já instalado: $NODE_VERSION"

    # Verificar se é versão 20
    if [[ ! $NODE_VERSION == v20* ]]; then
        log_info "Instalando Node.js 20 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
        sudo apt install -y nodejs > /dev/null 2>&1
    fi
else
    log_info "Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y nodejs > /dev/null 2>&1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js $NODE_VERSION e npm $NPM_VERSION instalados!"

# Instalar PM2 globalmente
if ! command -v pm2 &> /dev/null; then
    log_info "Instalando PM2..."
    sudo npm install -g pm2 > /dev/null 2>&1
    log_success "PM2 instalado!"
else
    log_warning "PM2 já instalado"
fi

################################################################################
# 3. POSTGRESQL
################################################################################

log_info "=== ETAPA 3: PostgreSQL ==="

if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    log_warning "PostgreSQL já instalado: $PG_VERSION"
else
    log_info "Instalando PostgreSQL 16..."

    # Adicionar repositório
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add - > /dev/null 2>&1
    sudo apt update -qq
    sudo apt install -y postgresql-16 postgresql-contrib-16 > /dev/null 2>&1

    log_success "PostgreSQL 16 instalado!"
fi

# Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql > /dev/null 2>&1

# Verificar se banco existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    log_warning "Banco de dados '$DB_NAME' já existe"
else
    log_info "Criando banco de dados e usuário..."

    sudo -u postgres psql << EOF > /dev/null 2>&1
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

    log_success "Banco de dados '$DB_NAME' criado!"
fi

# Testar conexão
if PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexão com PostgreSQL OK!"
else
    log_error "Falha ao conectar no PostgreSQL"
    exit 1
fi

################################################################################
# 4. REDIS
################################################################################

log_info "=== ETAPA 4: Redis ==="

if command -v redis-server &> /dev/null; then
    log_warning "Redis já instalado"
else
    log_info "Instalando Redis..."
    sudo apt install -y redis-server > /dev/null 2>&1

    # Configurar Redis
    sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf

    log_success "Redis instalado!"
fi

# Iniciar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server > /dev/null 2>&1

# Testar Redis
if redis-cli ping | grep -q PONG; then
    log_success "Redis funcionando!"
else
    log_error "Redis não está respondendo"
fi

################################################################################
# 5. NGINX
################################################################################

log_info "=== ETAPA 5: Nginx ==="

if command -v nginx &> /dev/null; then
    log_warning "Nginx já instalado"
else
    log_info "Instalando Nginx..."
    sudo apt install -y nginx > /dev/null 2>&1
    log_success "Nginx instalado!"
fi

sudo systemctl start nginx
sudo systemctl enable nginx > /dev/null 2>&1

# Criar diretórios necessários
sudo mkdir -p /var/www/sys-ticket/frontend
sudo chown -R www-data:www-data /var/www/sys-ticket

log_success "Nginx configurado!"

################################################################################
# 6. FIREWALL (UFW)
################################################################################

log_info "=== ETAPA 6: Firewall (UFW) ==="

if sudo ufw status | grep -q "Status: active"; then
    log_warning "UFW já está ativo"
else
    log_info "Configurando firewall..."

    # Permitir SSH primeiro!
    sudo ufw allow 22/tcp > /dev/null 2>&1
    sudo ufw allow 80/tcp > /dev/null 2>&1
    sudo ufw allow 443/tcp > /dev/null 2>&1

    # Habilitar UFW
    echo "y" | sudo ufw enable > /dev/null 2>&1

    log_success "Firewall configurado!"
fi

################################################################################
# 7. CRIAR USUÁRIO DA APLICAÇÃO
################################################################################

log_info "=== ETAPA 7: Usuário da Aplicação ==="

if id "sys-ticket" &>/dev/null; then
    log_warning "Usuário 'sys-ticket' já existe"
else
    log_info "Criando usuário 'sys-ticket'..."
    sudo adduser --disabled-password --gecos "" sys-ticket
    sudo usermod -aG www-data sys-ticket
    log_success "Usuário 'sys-ticket' criado!"
fi

################################################################################
# 8. DIRETÓRIOS E PERMISSÕES
################################################################################

log_info "=== ETAPA 8: Diretórios ==="

# Criar diretórios necessários
sudo mkdir -p /backups/sys-ticket
sudo mkdir -p /var/log/sys-ticket
sudo mkdir -p /home/sys-ticket/uploads

# Ajustar permissões
sudo chown -R sys-ticket:sys-ticket /backups/sys-ticket
sudo chown -R sys-ticket:sys-ticket /var/log/sys-ticket
sudo chown -R sys-ticket:sys-ticket /home/sys-ticket/uploads

log_success "Diretórios criados!"

################################################################################
# 9. CONFIGURAR .PGPASS (para backups sem senha)
################################################################################

log_info "=== ETAPA 9: Configurando .pgpass ==="

sudo -u sys-ticket bash << EOF
echo "localhost:5432:$DB_NAME:$DB_USER:$DB_PASSWORD" > ~/.pgpass
chmod 600 ~/.pgpass
EOF

log_success ".pgpass configurado!"

################################################################################
# 10. CRIAR SCRIPTS DE BACKUP
################################################################################

log_info "=== ETAPA 10: Scripts de Backup ==="

# Script de backup do banco
sudo tee /home/sys-ticket/backup-db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/sys-ticket"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="sys_ticket_db_$DATE.sql.gz"

pg_dump -U sys_ticket -h localhost sys_ticket_db | gzip > "$BACKUP_DIR/$FILENAME"
find $BACKUP_DIR -name "sys_ticket_db_*.sql.gz" -mtime +7 -delete

echo "$(date): Backup realizado: $FILENAME" >> /var/log/sys-ticket/backup.log
EOF

# Script de backup de arquivos
sudo tee /home/sys-ticket/backup-files.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/sys-ticket"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="sys_ticket_files_$DATE.tar.gz"

tar -czf "$BACKUP_DIR/$FILENAME" \
  /home/sys-ticket/uploads \
  /home/sys-ticket/sys-ticket/apps/backend/.env 2>/dev/null

find $BACKUP_DIR -name "sys_ticket_files_*.tar.gz" -mtime +7 -delete

echo "$(date): Backup de arquivos realizado: $FILENAME" >> /var/log/sys-ticket/backup.log
EOF

# Tornar executáveis
sudo chmod +x /home/sys-ticket/backup-db.sh
sudo chmod +x /home/sys-ticket/backup-files.sh
sudo chown sys-ticket:sys-ticket /home/sys-ticket/backup-db.sh
sudo chown sys-ticket:sys-ticket /home/sys-ticket/backup-files.sh

log_success "Scripts de backup criados!"

################################################################################
# 11. CONFIGURAR CRON PARA BACKUPS
################################################################################

log_info "=== ETAPA 11: Agendamento de Backups ==="

# Adicionar ao cron do usuário sys-ticket
sudo -u sys-ticket bash << 'EOF'
(crontab -l 2>/dev/null | grep -v backup-db.sh; echo "0 2 * * * /home/sys-ticket/backup-db.sh") | crontab -
(crontab -l 2>/dev/null | grep -v backup-files.sh; echo "30 2 * * * /home/sys-ticket/backup-files.sh") | crontab -
EOF

log_success "Backups agendados (2h e 2h30 da manhã)!"

################################################################################
# 12. CONFIGURAÇÃO DO NGINX
################################################################################

log_info "=== ETAPA 12: Configurando Nginx ==="

# Remover configuração padrão
sudo rm -f /etc/nginx/sites-enabled/default

# Criar configuração básica (sem SSL por enquanto)
sudo tee /etc/nginx/sites-available/sys-ticket > /dev/null << 'EOF'
# Backend API
server {
    listen 80;
    server_name localhost;

    access_log /var/log/nginx/sys-ticket-api-access.log;
    error_log /var/log/nginx/sys-ticket-api-error.log;

    client_max_body_size 20M;

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
EOF

# Habilitar site
sudo ln -sf /etc/nginx/sites-available/sys-ticket /etc/nginx/sites-enabled/

# Testar configuração
if sudo nginx -t > /dev/null 2>&1; then
    sudo systemctl reload nginx
    log_success "Nginx configurado!"
else
    log_error "Erro na configuração do Nginx"
fi

################################################################################
# 13. CRIAR ARQUIVO .ENV TEMPLATE
################################################################################

log_info "=== ETAPA 13: Criando template .env ==="

sudo -u sys-ticket tee /home/sys-ticket/.env.template > /dev/null << EOF
# Application
NODE_ENV=production
PORT=3000
APP_NAME=Sys-Ticket API
APP_URL=http://localhost

# CORS
CORS_ORIGIN=*

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT (GERE SENHAS FORTES EM PRODUÇÃO!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=7d

# SIGE Cloud API
SIGE_CLOUD_API_URL=https://api.sigecloud.com.br/v1
SIGE_CLOUD_API_KEY=
SIGE_CLOUD_API_SECRET=
SIGE_CLOUD_TIMEOUT=30000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/home/sys-ticket/uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Sys-Ticket
SMTP_FROM_EMAIL=noreply@localhost

# Storage
STORAGE_TYPE=local

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info
EOF

log_success "Template .env criado em /home/sys-ticket/.env.template"

################################################################################
# RESUMO FINAL
################################################################################

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║          ✅ SERVIDOR CONFIGURADO COM SUCESSO!             ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 RESUMO DA INSTALAÇÃO:${NC}"
echo ""
echo -e "  ${GREEN}✅${NC} Node.js $(node --version)"
echo -e "  ${GREEN}✅${NC} npm $(npm --version)"
echo -e "  ${GREEN}✅${NC} PM2 $(pm2 --version)"
echo -e "  ${GREEN}✅${NC} PostgreSQL (Porta 5432)"
echo -e "  ${GREEN}✅${NC} Redis (Porta 6379)"
echo -e "  ${GREEN}✅${NC} Nginx (Porta 80)"
echo -e "  ${GREEN}✅${NC} Firewall UFW ativo"
echo -e "  ${GREEN}✅${NC} Backups automáticos configurados"
echo ""

echo -e "${BLUE}🗄️  BANCO DE DADOS:${NC}"
echo -e "  Nome: $DB_NAME"
echo -e "  Usuário: $DB_USER"
echo -e "  Senha: $DB_PASSWORD"
echo -e "  Host: localhost:5432"
echo ""

echo -e "${BLUE}📁 DIRETÓRIOS CRIADOS:${NC}"
echo -e "  /home/sys-ticket/          - Diretório do usuário"
echo -e "  /home/sys-ticket/uploads/  - Upload de arquivos"
echo -e "  /backups/sys-ticket/       - Backups automáticos"
echo -e "  /var/www/sys-ticket/       - Frontend (build)"
echo -e "  /var/log/sys-ticket/       - Logs da aplicação"
echo ""

echo -e "${YELLOW}⚠️  PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "  ${BLUE}1.${NC} Clonar repositório:"
echo -e "     ${GREEN}sudo su - sys-ticket${NC}"
echo -e "     ${GREEN}git clone SEU_REPOSITORIO ~/sys-ticket${NC}"
echo ""
echo -e "  ${BLUE}2.${NC} Configurar .env:"
echo -e "     ${GREEN}cp ~/.env.template ~/sys-ticket/apps/backend/.env${NC}"
echo -e "     ${GREEN}nano ~/sys-ticket/apps/backend/.env${NC}"
echo ""
echo -e "  ${BLUE}3.${NC} Instalar dependências:"
echo -e "     ${GREEN}cd ~/sys-ticket${NC}"
echo -e "     ${GREEN}npm install${NC}"
echo ""
echo -e "  ${BLUE}4.${NC} Build e migrations:"
echo -e "     ${GREEN}cd ~/sys-ticket/apps/backend${NC}"
echo -e "     ${GREEN}npm run build${NC}"
echo -e "     ${GREEN}npm run migration:run${NC}"
echo ""
echo -e "  ${BLUE}5.${NC} Iniciar com PM2:"
echo -e "     ${GREEN}pm2 start dist/main.js --name sys-ticket-api${NC}"
echo -e "     ${GREEN}pm2 save${NC}"
echo -e "     ${GREEN}pm2 startup${NC}"
echo ""

echo -e "${BLUE}📝 ARQUIVOS IMPORTANTES:${NC}"
echo -e "  Template .env: /home/sys-ticket/.env.template"
echo -e "  Backup DB: /home/sys-ticket/backup-db.sh"
echo -e "  Backup Files: /home/sys-ticket/backup-files.sh"
echo -e "  Nginx Config: /etc/nginx/sites-available/sys-ticket"
echo ""

echo -e "${BLUE}🔍 COMANDOS ÚTEIS:${NC}"
echo -e "  ${GREEN}sudo systemctl status postgresql${NC}  - Status PostgreSQL"
echo -e "  ${GREEN}sudo systemctl status redis${NC}       - Status Redis"
echo -e "  ${GREEN}sudo systemctl status nginx${NC}       - Status Nginx"
echo -e "  ${GREEN}pm2 status${NC}                        - Status PM2"
echo -e "  ${GREEN}pm2 logs${NC}                          - Logs da aplicação"
echo -e "  ${GREEN}sudo ufw status${NC}                   - Status Firewall"
echo ""

echo -e "${GREEN}✨ Servidor pronto para receber a aplicação!${NC}"
echo ""
