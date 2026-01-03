# 🎯 Próximos Passos - Sys-Ticket

## ✅ O que foi criado

A estrutura completa do projeto Sys-Ticket foi configurada com sucesso:

### Backend (NestJS + TypeScript)
- ✅ Projeto NestJS configurado
- ✅ TypeORM com PostgreSQL
- ✅ Entidades principais: Users, Tickets, Timesheets, ServiceDesks
- ✅ Módulos estruturados
- ✅ Swagger/OpenAPI configurado
- ✅ Filtros e Interceptors globais
- ✅ Autenticação JWT (estrutura)

### Frontend (React + Vite)
- ✅ Projeto React + TypeScript + Vite
- ✅ TailwindCSS configurado
- ✅ React Query configurado
- ✅ React Router configurado
- ✅ Estrutura de pastas organizada

### Mobile (React Native + Expo)
- ✅ Projeto Expo configurado
- ✅ Permissões para câmera, GPS, fotos
- ✅ Estrutura para SQLite offline
- ✅ Configurações para assinatura digital

### Infraestrutura
- ✅ Docker Compose (PostgreSQL + Redis)
- ✅ Scripts de desenvolvimento
- ✅ ESLint + Prettier
- ✅ Git Hooks (Husky + Lint Staged)

### Documentação
- ✅ README completo
- ✅ Quick Start Guide
- ✅ Database Schema
- ✅ API Integration Guide

---

## 🚀 Como Começar

### 1. Instalar Dependências

```bash
# Instalar todas as dependências do monorepo
npm install
```

### 2. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp apps/backend/.env.example apps/backend/.env

# Editar e configurar:
# - Credenciais do banco de dados
# - JWT secrets
# - API keys do SIGE Cloud (quando disponível)
nano apps/backend/.env
```

### 3. Subir Infraestrutura

```bash
# Iniciar PostgreSQL e Redis
docker-compose up -d postgres redis

# Verificar se subiram
docker-compose ps
```

### 4. Executar Migrations

```bash
# Criar as tabelas no banco
npm run db:migrate
```

### 5. Iniciar Desenvolvimento

```bash
# Opção 1: Tudo junto (backend + frontend)
npm run dev

# Opção 2: Separadamente
npm run dev:backend   # Porta 3000
npm run dev:frontend  # Porta 5173
npm run dev:mobile    # Expo
```

### 6. Acessar

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs

---

## 📝 Tarefas Prioritárias

### Fase 1: Backend - Funcionalidades Core (1-2 semanas)

#### 1.1 Autenticação Completa
```
apps/backend/src/modules/auth/
├── auth.controller.ts    # POST /login, /refresh, /logout
├── auth.service.ts       # Lógica de autenticação
├── jwt.strategy.ts       # Estratégia JWT
└── local.strategy.ts     # Estratégia local
```

**Tarefas:**
- [ ] Implementar login (email/senha)
- [ ] Implementar refresh token
- [ ] Implementar logout
- [ ] Guards de autenticação
- [ ] Decoradores customizados (@CurrentUser)

#### 1.2 CRUD Completo de Tickets
```
apps/backend/src/modules/tickets/
├── tickets.controller.ts
├── tickets.service.ts
├── dto/
│   ├── create-ticket.dto.ts
│   ├── update-ticket.dto.ts
│   └── filter-ticket.dto.ts
└── entities/
    └── ticket.entity.ts  ✅ (já criado)
```

**Tarefas:**
- [ ] Criar DTOs de validação
- [ ] Implementar CRUD básico
- [ ] Implementar busca avançada
- [ ] Implementar filtros
- [ ] Paginação
- [ ] Ordenação

#### 1.3 Integração SIGE Cloud
```
apps/backend/src/modules/clients/
├── clients.service.ts    # Consulta API SIGE
├── sige-cloud.service.ts # Cliente HTTP SIGE
└── dto/
    └── sige-client.dto.ts

apps/backend/src/modules/contracts/
├── contracts.service.ts
└── dto/
    └── sige-contract.dto.ts
```

**Tarefas:**
- [ ] Criar cliente HTTP para SIGE Cloud
- [ ] Endpoint de busca de clientes
- [ ] Endpoint de consulta de contratos
- [ ] Cache Redis (60min)
- [ ] Tratamento de erros da API SIGE

#### 1.4 Apontamentos de Tempo
```
apps/backend/src/modules/timesheets/
├── timesheets.controller.ts
├── timesheets.service.ts
├── dto/
│   ├── create-timesheet.dto.ts
│   ├── start-timesheet.dto.ts
│   └── stop-timesheet.dto.ts
└── entities/
    └── timesheet.entity.ts  ✅ (já criado)
```

**Tarefas:**
- [ ] Iniciar/pausar/parar timer
- [ ] Calcular duração
- [ ] Valorização automática
- [ ] Vincular a tickets

#### 1.5 Precificação e Faturamento
```
apps/backend/src/modules/invoices/
├── invoices.controller.ts
├── invoices.service.ts
└── dto/
    ├── close-ticket.dto.ts
    └── create-os.dto.ts
```

**Tarefas:**
- [ ] Endpoint de fechamento de ticket
- [ ] Cálculo de valores
- [ ] Integração com SIGE para criar OS
- [ ] Tratamento de erros de faturamento

### Fase 2: Frontend Web (1-2 semanas)

#### 2.1 Autenticação
```
apps/frontend/src/
├── pages/
│   ├── Login.tsx
│   └── Dashboard.tsx
├── hooks/
│   └── useAuth.ts
└── services/
    └── auth.service.ts
```

**Tarefas:**
- [ ] Tela de login
- [ ] Persistir token (localStorage)
- [ ] Renovar token automaticamente
- [ ] Redirect após login
- [ ] Logout

#### 2.2 Gestão de Tickets
```
apps/frontend/src/pages/tickets/
├── TicketList.tsx       # Lista/Kanban
├── TicketDetail.tsx     # Detalhes
├── TicketCreate.tsx     # Criar
└── components/
    ├── TicketCard.tsx
    ├── TicketFilters.tsx
    └── TicketStatus.tsx
```

**Tarefas:**
- [ ] Listagem de tickets
- [ ] Criação de ticket
- [ ] Edição de ticket
- [ ] Visualização de detalhes
- [ ] Filtros e busca
- [ ] Kanban board

#### 2.3 Aviso de Contrato
```
apps/frontend/src/components/
└── ContractWarning.tsx
```

**Tarefas:**
- [ ] Modal/Alert ao selecionar cliente
- [ ] Consultar contratos via API
- [ ] Mostrar itens inclusos/excluídos
- [ ] Mostrar saldo

### Fase 3: App Mobile (2-3 semanas)

#### 3.1 Estrutura Base
```
apps/mobile/src/
├── navigation/
│   └── AppNavigator.tsx
├── screens/
│   ├── LoginScreen.tsx
│   ├── TicketsScreen.tsx
│   └── TicketDetailScreen.tsx
├── services/
│   ├── api.service.ts
│   └── offline.service.ts
└── database/
    └── schema.ts
```

**Tarefas:**
- [ ] Navegação
- [ ] Autenticação
- [ ] Listagem de tickets
- [ ] Detalhes de ticket

#### 3.2 Modo Offline
```
apps/mobile/src/database/
├── schema.ts           # Schema SQLite
├── sync.service.ts     # Sincronização
└── queue.service.ts    # Fila de sync
```

**Tarefas:**
- [ ] Configurar SQLite
- [ ] Criar schema local
- [ ] Implementar fila de sync
- [ ] Sync pull (servidor → app)
- [ ] Sync push (app → servidor)
- [ ] Resolução de conflitos

#### 3.3 Assinatura Digital
```
apps/mobile/src/screens/
└── SignatureScreen.tsx
```

**Tarefas:**
- [ ] Canvas de assinatura
- [ ] Captura de dados do signatário
- [ ] Salvar localmente se offline
- [ ] Upload quando online
- [ ] Anexar ao ticket

#### 3.4 Fotos e GPS
```
apps/mobile/src/services/
├── camera.service.ts
└── location.service.ts
```

**Tarefas:**
- [ ] Captura de fotos
- [ ] Geolocalização
- [ ] Metadados EXIF
- [ ] Upload de fotos
- [ ] Check-in/Check-out

---

## 🗂️ Estrutura de Desenvolvimento Recomendada

### Semana 1-2: Backend Core
- Autenticação JWT
- CRUD Tickets
- CRUD Apontamentos
- Integração básica SIGE (mock se necessário)

### Semana 3-4: Frontend Web
- Login
- Dashboard
- Listagem de tickets
- Criação de tickets
- Aviso de contrato

### Semana 5-6: Backend Avançado
- Precificação
- Faturamento (criar OS)
- Webhooks
- SLA

### Semana 7-9: App Mobile
- Estrutura base
- Offline mode
- Assinatura digital
- Fotos e GPS

### Semana 10-12: Consolidação
- Testes
- Relatórios
- Portal do cliente
- Base de conhecimento

---

## 🔧 Comandos Úteis Durante o Desenvolvimento

```bash
# Backend
cd apps/backend
npm run dev              # Desenvolvimento com hot-reload
npm run build            # Build produção
npm test                 # Testes unitários
npm run migration:generate -- -n NomeDaMigration

# Frontend
cd apps/frontend
npm run dev              # Desenvolvimento
npm run build            # Build produção
npm run preview          # Preview do build

# Mobile
cd apps/mobile
npm start                # Iniciar Expo
npm run android          # Rodar no Android
npm run ios              # Rodar no iOS

# Docker
docker-compose up -d     # Subir todos os serviços
docker-compose logs -f backend  # Ver logs do backend
docker-compose down      # Parar serviços
docker-compose restart postgres # Reiniciar PostgreSQL
```

---

## 📚 Recursos e Referências

### Documentação Oficial
- [NestJS](https://docs.nestjs.com/)
- [React](https://react.dev/)
- [React Native](https://reactnative.dev/)
- [TypeORM](https://typeorm.io/)
- [React Query](https://tanstack.com/query/latest)

### Bibliotecas Importantes
- [Class Validator](https://github.com/typestack/class-validator) - Validação de DTOs
- [Passport](http://www.passportjs.org/) - Autenticação
- [Axios](https://axios-http.com/) - Cliente HTTP
- [Socket.io](https://socket.io/) - WebSockets
- [Expo](https://docs.expo.dev/) - React Native

---

## 🎓 Dicas de Desenvolvimento

1. **Comece pelo Backend**: É mais fácil testar via Swagger
2. **Use o Swagger**: Teste endpoints antes de implementar no front
3. **Commits frequentes**: Commits pequenos e descritivos
4. **Branches**: Use feature branches (`feature/autenticacao`)
5. **Code Review**: Revise seu próprio código antes de commitar
6. **Testes**: Escreva testes para funcionalidades críticas
7. **Documentação**: Documente decisões importantes

---

## 🐛 Troubleshooting Comum

**Problema**: PostgreSQL não conecta
```bash
# Solução: Reiniciar container
docker-compose restart postgres
docker-compose logs postgres
```

**Problema**: Migrations não executam
```bash
# Solução: Recriar banco
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

**Problema**: Porta 3000 ocupada
```bash
# Solução: Alterar porta no .env
PORT=3001
```

**Problema**: Módulo não encontrado
```bash
# Solução: Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ Checklist de Desenvolvimento

### Backend
- [ ] Autenticação funcional
- [ ] CRUD Tickets completo
- [ ] Integração SIGE Cloud (clientes)
- [ ] Integração SIGE Cloud (contratos)
- [ ] Apontamentos de tempo
- [ ] Precificação
- [ ] Criar OS no SIGE
- [ ] Webhooks básicos
- [ ] Documentação Swagger atualizada

### Frontend
- [ ] Login/Logout
- [ ] Dashboard
- [ ] Listagem de tickets
- [ ] Criar ticket
- [ ] Editar ticket
- [ ] Aviso de contrato
- [ ] Apontamentos
- [ ] Fechar e faturar ticket

### Mobile
- [ ] Autenticação
- [ ] Listagem offline
- [ ] Criar ticket offline
- [ ] Apontamentos offline
- [ ] Assinatura digital
- [ ] Fotos com GPS
- [ ] Sincronização funcionando

---

## 🚀 Pronto para Começar!

Execute:
```bash
npm install
docker-compose up -d postgres redis
npm run dev
```

Acesse http://localhost:3000/api/docs e comece a desenvolver! 🎉

---

**Dúvidas?** Consulte a documentação em [`/docs`](./docs/) ou abra uma issue.

Bom desenvolvimento! 💻✨
