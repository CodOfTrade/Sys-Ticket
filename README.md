# Sys-Ticket - Sistema de Gestao de Tickets

Sistema web completo de gestao de tickets e atendimento ao cliente, com app mobile offline e integracao nativa com SIGE Cloud.

## Indice

- [Visao Geral](#visao-geral)
- [Tech Stack](#tech-stack)
- [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
- [Quick Start](#quick-start)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Comandos Essenciais](#comandos-essenciais)
- [Workflow de Deploy](#workflow-de-deploy)
- [Documentacao Adicional](#documentacao-adicional)

---

## Visao Geral

O Sys-Ticket gerencia todo o ciclo de vida de tickets, desde a abertura ate o faturamento integrado com SIGE Cloud.

### Funcionalidades Principais

- **Gestao de Tickets**: Criacao, acompanhamento, multiplos status, SLA configuravel
- **Integracao SIGE Cloud**: Consulta de clientes, contratos e criacao automatica de OS
- **App Mobile Offline**: Funciona sem internet, com sincronizacao inteligente
- **Assinatura Digital**: Coleta de assinatura em tela touch
- **Precificacao Inteligente**: Baseada em contratos do SIGE
- **Apontamentos de Tempo**: Timer play/pause, valorizacao automatica
- **API REST Completa**: Documentada com Swagger
- **Webhooks para n8n**: Automacoes externas via eventos

---

## Tech Stack

### Backend
- **Framework**: NestJS + TypeScript
- **Banco de Dados**: PostgreSQL + TypeORM
- **Cache**: Redis
- **API**: RESTful com Swagger/OpenAPI
- **Autenticacao**: JWT com refresh tokens
- **Real-time**: Socket.io

### Frontend Web
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + React Query
- **UI**: TailwindCSS
- **Routing**: React Router v6

### Mobile
- **Framework**: React Native + Expo
- **Offline Storage**: SQLite
- **Geolocalizacao**: Expo Location
- **Camera/Fotos**: Expo Camera/Image Picker
- **Assinatura**: React Native Signature Canvas

---

## Ambiente de Desenvolvimento

### Servidor de Desenvolvimento/Testes

| Item | Valor |
|------|-------|
| **IP** | 172.31.255.26 |
| **Usuario SSH** | root |
| **Senha SSH** | 123321 |
| **URL Frontend** | https://172.31.255.26 |
| **URL Backend** | https://172.31.255.26/api |
| **Swagger Docs** | https://172.31.255.26/api/docs |

### Banco de Dados (PostgreSQL)

| Item | Valor |
|------|-------|
| **Host** | localhost (no servidor) / 172.31.255.26 (remoto) |
| **Porta** | 5432 |
| **Usuario** | sys_ticket |
| **Senha** | 123321 |
| **Database** | sys_ticket_db |

**Comando de acesso local no servidor:**
```bash
PGPASSWORD='123321' psql -U sys_ticket -d sys_ticket_db -h localhost
```

### Estrutura de Diretorios no Servidor

```
/root/Sys-Ticket/                    # Repositorio Git (codigo-fonte)
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   ├── dist/                    # Build compilado
│   │   └── node_modules/
│   └── frontend/
│       ├── src/
│       ├── dist/                    # Build compilado
│       └── node_modules/

/var/www/sys-ticket/                 # Frontend (servido pelo nginx)
├── index.html
└── assets/
```

### Servicos no Servidor

**Backend (PM2):**
```bash
pm2 list                    # Listar processos
pm2 logs backend            # Ver logs
pm2 restart backend         # Reiniciar
```

**Frontend (nginx):**
```bash
systemctl status nginx      # Status
systemctl reload nginx      # Recarregar config
nginx -t                    # Testar config
```

---

## Quick Start

### Pre-requisitos

- Node.js >= 18.x
- npm >= 9.x
- Docker >= 24.x (opcional)
- PostgreSQL 16+ (via Docker ou local)
- Redis 7+ (via Docker ou local)

### Setup Windows

1. **Instalar Node.js**
   - Baixe de https://nodejs.org/ (versao LTS 20.x)

2. **Instalar PostgreSQL**
   - Baixe de https://www.postgresql.org/download/windows/
   - Durante instalacao: senha `postgres`, porta `5432`

3. **Instalar Redis (opcional)**
   - Via Docker: `docker run -d -p 6379:6379 redis:alpine`
   - Ou via WSL2: `sudo apt-get install redis-server`

### Setup Geral

```bash
# 1. Clone o repositorio
git clone https://github.com/CodOfTrade/Sys-Ticket.git
cd sys-ticket

# 2. Instale as dependencias
npm install

# 3. Configure as variaveis de ambiente
cp apps/backend/.env.example apps/backend/.env
# Edite apps/backend/.env com suas configuracoes

# 4. Inicie os servicos com Docker (PostgreSQL e Redis)
docker-compose up -d postgres redis

# 5. Execute as migrations
npm run db:migrate

# 6. (Opcional) Popule o banco com dados de teste
npm run db:seed

# 7. Inicie o desenvolvimento
npm run dev
```

### Acessar a Aplicacao

- **Frontend Web**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs

### Credenciais Padrao (dev)

- **Email**: `admin@sys-ticket.com`
- **Senha**: `admin123`

---

## Estrutura do Projeto

```
sys-ticket/
├── apps/
│   ├── backend/              # API NestJS
│   │   ├── src/
│   │   │   ├── modules/      # Modulos (tickets, users, auth, clients, etc)
│   │   │   ├── shared/       # Codigo compartilhado (guards, filters, decorators)
│   │   │   ├── config/       # Configuracoes (TypeORM, etc)
│   │   │   └── database/     # Migrations e seeds
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── frontend/             # Web React + Vite
│   │   ├── src/
│   │   │   ├── components/   # Componentes reutilizaveis
│   │   │   ├── pages/        # Paginas/Rotas
│   │   │   ├── services/     # Chamadas API
│   │   │   ├── store/        # Estado global (Zustand)
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── types/        # Tipos TypeScript
│   │   └── package.json
│   │
│   └── mobile/               # App React Native + Expo
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── services/
│       │   └── database/     # SQLite offline
│       └── package.json
│
├── packages/
│   └── shared/               # Codigo compartilhado (tipos, utils)
│
├── docker/                   # Arquivos Docker
│   └── init-db.sql
│
├── docs/                     # Documentacao tecnica
│   ├── SERVER-SETUP.md       # Configuracao servidor Ubuntu
│   ├── DATABASE.md           # Schema do banco
│   └── API-INTEGRATION.md    # Integracao API e Webhooks
│
├── docker-compose.yml
└── package.json              # Root workspace
```

---

## Comandos Essenciais

### Desenvolvimento

```bash
# Iniciar tudo (backend + frontend)
npm run dev

# Iniciar separadamente
npm run dev:backend       # Backend na porta 3000
npm run dev:frontend      # Frontend na porta 5173
npm run dev:mobile        # Expo mobile

# Build
npm run build:backend
npm run build:frontend
```

### Docker

```bash
# Subir todos os servicos
docker-compose up -d

# Subir apenas banco e cache
docker-compose up -d postgres redis

# Parar servicos
docker-compose down

# Ver logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Reiniciar servico especifico
docker-compose restart postgres
```

### Banco de Dados

```bash
# Executar migrations
npm run db:migrate

# Seed de dados de teste
npm run db:seed

# Acessar banco via Docker
docker-compose exec postgres psql -U sys_ticket -d sys_ticket_db

# Comandos SQL uteis no psql
\dt                    # Listar tabelas
\d users               # Descrever tabela users
SELECT * FROM users;   # Query
\q                     # Sair
```

### PM2 (Servidor)

```bash
pm2 list                    # Listar processos
pm2 logs backend            # Ver logs
pm2 logs backend --lines 50 # Ultimas 50 linhas
pm2 restart backend         # Reiniciar
pm2 status                  # Status detalhado
pm2 monit                   # Monitor em tempo real
```

### Git

```bash
git status
git log --oneline -10
git diff

# No servidor, verificar commits
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git log --oneline -5"
```

---

## Workflow de Deploy

### Deploy Completo (Backend + Frontend)

```bash
# 1. Commit e push local
git add .
git commit -m "Mensagem"
git push

# 2. Deploy no servidor
ssh root@172.31.255.26

cd /root/Sys-Ticket
git pull

# Backend
cd apps/backend
npm run build
pm2 restart backend

# Frontend
cd ../frontend
npm run build
rm -rf /var/www/sys-ticket/*
cp -r dist/* /var/www/sys-ticket/
```

### Deploy Rapido (Comandos unicos)

**Backend:**
```bash
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/backend && npm run build && pm2 restart backend"
```

**Frontend:**
```bash
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/frontend && npm run build && rm -rf /var/www/sys-ticket/* && cp -r dist/* /var/www/sys-ticket/"
```

### Verificar Deploy

```bash
# Ver logs do backend
pm2 logs backend --lines 20

# Testar API
curl https://172.31.255.26/api

# Testar frontend
curl https://172.31.255.26
```

---

## Autenticacao e Seguranca

### Sistema de Auth Global

- **Guard Global**: JwtAuthGuard (APP_GUARD no app.module.ts)
- **Decorator @Public()**: Usado para endpoints que NAO precisam de autenticacao
- **Localizacao**: `apps/backend/src/modules/auth/decorators/public.decorator.ts`

### Endpoints Publicos (com @Public())

```typescript
// Exemplo de uso no controller:
@Get()
@Public()
async findAll() { }
```

**Endpoints ja configurados como publicos:**
- `GET /api/v1/service-catalog` - Listar catalogos
- `GET /api/v1/tickets` - Listar tickets
- `GET /api/v1/tickets/:id` - Buscar ticket por ID
- `POST /api/v1/tickets` - Criar ticket
- `GET /api/v1/clients` - Listar clientes
- `GET /api/v1/clients/search` - Buscar clientes
- Endpoints de clients/contacts (CRUD completo)

---

## Troubleshooting

### PostgreSQL nao conecta

```bash
# Verificar se container esta rodando
docker-compose ps

# Reiniciar
docker-compose restart postgres

# Ver logs
docker-compose logs postgres
```

### Porta 3000 ja em uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <numero_do_pid> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Ou altere no .env
PORT=3001
```

### Migrations nao executam

```bash
# Force recriar o banco
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

### Frontend nao carrega no servidor

```bash
# Verificar nginx
nginx -t
systemctl reload nginx

# Verificar permissoes
ls -la /var/www/sys-ticket/

# Verificar logs nginx
tail -f /var/log/nginx/error.log
```

---

## Documentacao Adicional

- [SERVER-SETUP.md](docs/SERVER-SETUP.md) - Guia completo de configuracao do servidor Ubuntu para producao
- [DATABASE.md](docs/DATABASE.md) - Schema completo do banco de dados PostgreSQL
- [API-INTEGRATION.md](docs/API-INTEGRATION.md) - Documentacao da API, webhooks e exemplos de integracao

---

## Links Uteis

- **Repositorio**: https://github.com/CodOfTrade/Sys-Ticket.git
- **Swagger Docs (dev)**: http://localhost:3000/api/docs
- **Swagger Docs (servidor)**: https://172.31.255.26/api/docs

---

## Licenca

Este projeto e proprietario e confidencial. Todos os direitos reservados.
