# ⚡ Comandos Úteis - Sys-Ticket

Referência rápida de comandos para desenvolvimento.

---

## 🚀 Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp apps/backend/.env.example apps/backend/.env

# 3. Subir banco de dados
docker-compose up -d postgres redis

# 4. Executar migrations
npm run db:migrate

# 5. Iniciar desenvolvimento
npm run dev
```

---

## 📦 Gerenciamento de Dependências

### Instalar Dependências

```bash
# Todas as dependências do workspace
npm install

# Apenas backend
npm install --workspace=apps/backend

# Apenas frontend
npm install --workspace=apps/frontend

# Apenas mobile
npm install --workspace=apps/mobile

# Adicionar nova dependência ao backend
npm install axios --workspace=apps/backend

# Adicionar devDependency ao frontend
npm install -D @types/react --workspace=apps/frontend
```

### Limpar e Reinstalar

```bash
# Remover node_modules e reinstalar
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules
npm install
```

---

## 🔧 Desenvolvimento

### Backend

```bash
# Desenvolvimento (hot-reload)
npm run dev:backend
# ou
cd apps/backend && npm run dev

# Build
npm run build:backend

# Testes
cd apps/backend
npm test                    # Todos os testes
npm run test:watch         # Watch mode
npm run test:cov           # Com cobertura
npm run test:e2e           # Testes E2E

# Lint e Format
npm run lint
npm run format
```

### Frontend

```bash
# Desenvolvimento
npm run dev:frontend
# ou
cd apps/frontend && npm run dev

# Build
npm run build:frontend

# Preview do build
cd apps/frontend && npm run preview

# Lint
cd apps/frontend && npm run lint
```

### Mobile

```bash
# Iniciar Expo
npm run dev:mobile
# ou
cd apps/mobile && npm start

# Rodar em dispositivo/emulador
cd apps/mobile
npm run android    # Android
npm run ios        # iOS
npm run web        # Web

# Build
cd apps/mobile
npm run build:android
npm run build:ios
```

---

## 🐳 Docker

### Comandos Principais

```bash
# Subir todos os serviços
docker-compose up -d

# Subir serviços específicos
docker-compose up -d postgres redis

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Ver logs
docker-compose logs -f           # Todos
docker-compose logs -f backend   # Apenas backend
docker-compose logs -f postgres  # Apenas PostgreSQL

# Reiniciar serviço
docker-compose restart backend
docker-compose restart postgres

# Ver status
docker-compose ps

# Entrar no container
docker-compose exec backend sh
docker-compose exec postgres psql -U sys_ticket -d sys_ticket_db
```

### Troubleshooting Docker

```bash
# Reconstruir imagens
docker-compose build --no-cache

# Remover containers órfãos
docker-compose down --remove-orphans

# Ver uso de recursos
docker stats

# Limpar sistema Docker (CUIDADO)
docker system prune -a
```

---

## 🗄️ Banco de Dados

### Migrations

```bash
cd apps/backend

# Gerar migration automaticamente
npm run migration:generate -- -n CreateUsersTable

# Criar migration vazia
npm run migration:create -- -n AddColumnToTickets

# Executar migrations
npm run migration:run

# Reverter última migration
npm run migration:revert

# Ver status das migrations
npm run typeorm migration:show
```

### Seeds

```bash
cd apps/backend

# Executar seeds
npm run seed:run

# Criar novo seed
# Crie arquivo em src/database/seeds/
```

### Acesso Direto ao Banco

```bash
# Via Docker
docker-compose exec postgres psql -U sys_ticket -d sys_ticket_db

# Comandos SQL úteis
\dt                    # Listar tabelas
\d users              # Descrever tabela users
SELECT * FROM users;  # Query
\q                    # Sair
```

### Backup e Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U sys_ticket sys_ticket_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U sys_ticket sys_ticket_db < backup.sql
```

---

## 🧪 Testes

### Backend

```bash
cd apps/backend

# Rodar todos os testes
npm test

# Watch mode
npm run test:watch

# Cobertura
npm run test:cov

# Testes E2E
npm run test:e2e

# Teste específico
npm test -- users.service.spec.ts

# Debug de testes
npm run test:debug
```

### Frontend

```bash
cd apps/frontend

# Testes (quando implementado)
npm test
npm run test:watch
```

---

## 🎨 Code Quality

### Lint

```bash
# Rodar ESLint em tudo
npm run lint

# Backend
cd apps/backend && npm run lint

# Frontend
cd apps/frontend && npm run lint

# Fix automático
npm run lint -- --fix
```

### Format

```bash
# Formatar tudo
npm run format

# Verificar formatação
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"
```

### Git Hooks

```bash
# Instalar hooks (automático no npm install)
npx husky install

# Adicionar novo hook
npx husky add .husky/pre-push "npm test"
```

---

## 📚 Swagger/API

### Acessar Documentação

```bash
# Backend deve estar rodando
# Acesse: http://localhost:3000/api/docs
```

### Exportar OpenAPI JSON

```bash
# Com backend rodando
curl http://localhost:3000/api-json > swagger.json
```

---

## 🔍 Debug

### Backend (NestJS)

```bash
cd apps/backend

# Debug mode
npm run start:debug

# No VS Code, use a configuração:
# - "Attach to NestJS"
```

### Frontend (React)

```bash
# React DevTools já funciona automaticamente
# Vite já tem HMR habilitado
```

---

## 📱 Mobile - Expo

### Comandos Expo

```bash
cd apps/mobile

# Limpar cache
npx expo start -c

# Instalar no dispositivo físico
# Use o app Expo Go e escaneie o QR code

# Build
eas build --platform android
eas build --platform ios

# Publicar update OTA
eas update
```

---

## 🚀 Deploy

### Backend (Produção)

```bash
cd apps/backend

# Build
npm run build

# Rodar em produção
npm run start:prod

# Com PM2
pm2 start dist/main.js --name sys-ticket-api
```

### Frontend (Build)

```bash
cd apps/frontend

# Build para produção
npm run build

# Preview local
npm run preview

# Conteúdo estático em: dist/
```

---

## 📊 Monitoramento

### Logs

```bash
# Docker logs
docker-compose logs -f backend

# Logs do sistema (se usar PM2)
pm2 logs sys-ticket-api

# Logs do PostgreSQL
docker-compose logs postgres
```

### Saúde do Sistema

```bash
# Verificar serviços
docker-compose ps

# Verificar uso de recursos
docker stats

# Health check do banco
docker-compose exec postgres pg_isready -U sys_ticket
```

---

## 🔄 Workflows Comuns

### Criar Nova Feature

```bash
# 1. Criar branch
git checkout -b feature/nome-da-feature

# 2. Desenvolver
npm run dev

# 3. Testar
npm test

# 4. Commit
git add .
git commit -m "feat: adiciona nova feature"

# 5. Push
git push origin feature/nome-da-feature
```

### Adicionar Nova Entidade

```bash
cd apps/backend

# 1. Criar entidade
# src/modules/novo-modulo/entities/novo.entity.ts

# 2. Criar migration
npm run migration:generate -- -n CreateNovoTable

# 3. Executar migration
npm run migration:run

# 4. Criar service e controller
# ...
```

### Atualizar Dependências

```bash
# Ver dependências desatualizadas
npm outdated

# Atualizar todas (cuidado)
npm update

# Atualizar específica
npm install axios@latest --workspace=apps/backend
```

---

## 🛠️ Troubleshooting

### Porta 3000 em uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Ou mude a porta no .env
PORT=3001
```

### PostgreSQL não conecta

```bash
# Verificar se está rodando
docker-compose ps

# Ver logs
docker-compose logs postgres

# Reiniciar
docker-compose restart postgres

# Recriar container
docker-compose down
docker-compose up -d postgres
```

### Migration falhou

```bash
# Ver status
npm run typeorm migration:show

# Reverter última
npm run migration:revert

# Se necessário, limpar migrations table
docker-compose exec postgres psql -U sys_ticket -d sys_ticket_db
# DELETE FROM migrations WHERE name = 'NomeDaMigration';
```

---

## 📋 Checklists

### Antes de Commitar

```bash
- [ ] npm run lint
- [ ] npm test
- [ ] npm run build (se alterou backend/frontend)
- [ ] Atualizar documentação se necessário
```

### Antes de Deploy

```bash
- [ ] Todos os testes passando
- [ ] Build de produção funciona
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] Backup do banco feito
```

---

## 🔗 Links Úteis

- **Swagger**: http://localhost:3000/api/docs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **PgAdmin**: http://localhost:5050
- **Redis Commander**: (instalar se necessário)

---

**Dica**: Salve este arquivo nos favoritos do seu editor para referência rápida! 🌟
