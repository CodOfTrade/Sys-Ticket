# 📂 Estrutura do Projeto - Sys-Ticket

## 🗂️ Visão Geral

```
sys-ticket/
│
├── 📱 apps/                      # Aplicações do monorepo
│   ├── backend/                 # API NestJS
│   ├── frontend/                # Web React
│   └── mobile/                  # App React Native
│
├── 📦 packages/                  # Pacotes compartilhados
│   └── shared/                  # Tipos, utils, constantes
│
├── 🐳 docker/                    # Configurações Docker
│   ├── init-db.sql
│   └── docker-compose.yml
│
├── 📚 docs/                      # Documentação
│   ├── QUICK-START.md
│   ├── DATABASE.md
│   └── API-INTEGRATION.md
│
└── 🔧 Arquivos de configuração
    ├── package.json             # Root workspace
    ├── .gitignore
    ├── .prettierrc
    ├── .eslintrc.json
    └── docker-compose.yml
```

---

## 🔙 Backend (apps/backend)

```
apps/backend/
│
├── 📄 src/
│   │
│   ├── 🎯 main.ts              # Entry point
│   ├── 📦 app.module.ts        # Módulo raiz
│   │
│   ├── 🔧 config/              # Configurações
│   │   └── typeorm.config.ts
│   │
│   ├── 🗂️ modules/             # Módulos de funcionalidade
│   │   │
│   │   ├── 🔐 auth/           # Autenticação JWT
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   │
│   │   ├── 👤 users/          # Gestão de usuários
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── 🏢 clients/        # Clientes (SIGE Cloud)
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   └── sige-cloud.service.ts
│   │   │
│   │   ├── 📋 contracts/      # Contratos (SIGE Cloud)
│   │   │   ├── contracts.module.ts
│   │   │   ├── contracts.controller.ts
│   │   │   └── contracts.service.ts
│   │   │
│   │   ├── 🎫 tickets/        # Tickets
│   │   │   ├── tickets.module.ts
│   │   │   ├── tickets.controller.ts
│   │   │   ├── tickets.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-ticket.dto.ts
│   │   │   │   ├── update-ticket.dto.ts
│   │   │   │   └── filter-ticket.dto.ts
│   │   │   └── entities/
│   │   │       └── ticket.entity.ts
│   │   │
│   │   ├── ⏱️ timesheets/     # Apontamentos
│   │   │   ├── timesheets.module.ts
│   │   │   ├── timesheets.controller.ts
│   │   │   ├── timesheets.service.ts
│   │   │   └── entities/
│   │   │       └── timesheet.entity.ts
│   │   │
│   │   ├── 🏪 service-desks/  # Mesas de Serviço
│   │   │   ├── service-desks.module.ts
│   │   │   ├── service-desks.controller.ts
│   │   │   ├── service-desks.service.ts
│   │   │   └── entities/
│   │   │       └── service-desk.entity.ts
│   │   │
│   │   ├── ⏰ sla/            # SLA
│   │   │   ├── sla.module.ts
│   │   │   ├── sla.controller.ts
│   │   │   └── sla.service.ts
│   │   │
│   │   ├── ✍️ signatures/     # Assinaturas Digitais
│   │   │   ├── signatures.module.ts
│   │   │   ├── signatures.controller.ts
│   │   │   └── signatures.service.ts
│   │   │
│   │   ├── 🪝 webhooks/       # Webhooks
│   │   │   ├── webhooks.module.ts
│   │   │   ├── webhooks.controller.ts
│   │   │   └── webhooks.service.ts
│   │   │
│   │   └── 🔄 sync/           # Sincronização Offline
│   │       ├── sync.module.ts
│   │       ├── sync.controller.ts
│   │       └── sync.service.ts
│   │
│   ├── 🔗 shared/             # Código compartilhado
│   │   ├── decorators/        # Decorators customizados
│   │   ├── filters/           # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/            # Guards de autenticação
│   │   ├── interceptors/      # Interceptors
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/             # Validation pipes
│   │   └── utils/             # Utilitários
│   │
│   └── 🗄️ database/           # Database
│       ├── migrations/        # Migrations do TypeORM
│       └── seeds/             # Seeds de dados
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 .env.example
└── 🐳 Dockerfile
```

---

## 🎨 Frontend (apps/frontend)

```
apps/frontend/
│
├── 📄 public/
│   └── vite.svg
│
├── 📄 src/
│   │
│   ├── 🎯 main.tsx            # Entry point
│   ├── 📦 App.tsx             # Componente raiz
│   ├── 🎨 index.css           # Estilos globais
│   │
│   ├── 📄 pages/              # Páginas/Rotas
│   │   ├── 🏠 Dashboard.tsx
│   │   ├── 🔐 Login.tsx
│   │   ├── 🎫 tickets/
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketDetail.tsx
│   │   │   ├── TicketCreate.tsx
│   │   │   └── TicketEdit.tsx
│   │   ├── 👤 users/
│   │   ├── 📊 reports/
│   │   └── ⚙️ settings/
│   │
│   ├── 🧩 components/         # Componentes reutilizáveis
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Card.tsx
│   │   └── tickets/
│   │       ├── TicketCard.tsx
│   │       ├── TicketFilters.tsx
│   │       ├── TicketStatus.tsx
│   │       └── ContractWarning.tsx
│   │
│   ├── 🔌 services/           # Serviços de API
│   │   ├── api.ts            # Cliente Axios
│   │   ├── auth.service.ts
│   │   ├── tickets.service.ts
│   │   ├── clients.service.ts
│   │   └── contracts.service.ts
│   │
│   ├── 🪝 hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTickets.ts
│   │   └── useContracts.ts
│   │
│   ├── 🗂️ store/             # Estado global (Zustand)
│   │   ├── auth.store.ts
│   │   ├── tickets.store.ts
│   │   └── ui.store.ts
│   │
│   ├── 📝 types/              # Tipos TypeScript
│   │   ├── ticket.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   │
│   └── 🛠️ utils/             # Utilitários
│       ├── formatters.ts
│       ├── validators.ts
│       └── constants.ts
│
├── 📄 index.html
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts
├── 📄 tailwind.config.js
└── 🐳 Dockerfile
```

---

## 📱 Mobile (apps/mobile)

```
apps/mobile/
│
├── 📄 assets/                 # Imagens, fontes, etc
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── 📄 src/
│   │
│   ├── 🎯 App.tsx            # Componente raiz
│   │
│   ├── 🗺️ navigation/        # Navegação
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   │
│   ├── 📱 screens/           # Telas
│   │   ├── 🔐 auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SplashScreen.tsx
│   │   ├── 🎫 tickets/
│   │   │   ├── TicketsScreen.tsx
│   │   │   ├── TicketDetailScreen.tsx
│   │   │   ├── CreateTicketScreen.tsx
│   │   │   └── TimesheetScreen.tsx
│   │   ├── ✍️ signature/
│   │   │   └── SignatureScreen.tsx
│   │   ├── 📸 photos/
│   │   │   └── CameraScreen.tsx
│   │   └── ⚙️ settings/
│   │       └── SettingsScreen.tsx
│   │
│   ├── 🧩 components/        # Componentes reutilizáveis
│   │   ├── TicketCard.tsx
│   │   ├── TimerButton.tsx
│   │   ├── OfflineBadge.tsx
│   │   └── SyncStatus.tsx
│   │
│   ├── 🔌 services/          # Serviços
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── offline.service.ts
│   │   ├── sync.service.ts
│   │   ├── camera.service.ts
│   │   └── location.service.ts
│   │
│   ├── 🗄️ database/          # SQLite local
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── queries.ts
│   │
│   ├── 🪝 hooks/             # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useOffline.ts
│   │   ├── useSync.ts
│   │   └── useLocation.ts
│   │
│   ├── 🗂️ store/            # Estado (Zustand)
│   │   ├── auth.store.ts
│   │   ├── tickets.store.ts
│   │   └── sync.store.ts
│   │
│   ├── 📝 types/             # Tipos
│   │   ├── ticket.types.ts
│   │   ├── sync.types.ts
│   │   └── navigation.types.ts
│   │
│   └── 🛠️ utils/            # Utilitários
│       ├── formatters.ts
│       └── validators.ts
│
├── 📄 app.json
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 babel.config.js
```

---

## 📦 Packages Compartilhados (packages/shared)

```
packages/shared/
│
├── 📄 src/
│   ├── types/                # Tipos compartilhados
│   │   ├── ticket.types.ts
│   │   ├── user.types.ts
│   │   ├── contract.types.ts
│   │   └── index.ts
│   │
│   ├── utils/                # Utilitários compartilhados
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── index.ts
│   │
│   └── constants/            # Constantes
│       ├── ticket-status.ts
│       ├── user-roles.ts
│       └── index.ts
│
└── 📄 package.json
```

---

## 🗄️ Database Schema (PostgreSQL)

```
PostgreSQL Database: sys_ticket_db
│
├── 📋 users
├── 📋 service_desks
├── 📋 tickets
├── 📋 timesheets
├── 📋 signatures
├── 📋 photos
├── 📋 webhooks
├── 📋 webhook_logs
└── 📋 migrations (TypeORM)
```

---

## 🐳 Docker Services

```
Docker Compose Services:
│
├── 🐘 postgres           # PostgreSQL 16
│   └── Port: 5432
│
├── 🔴 redis              # Redis 7
│   └── Port: 6379
│
├── 🔙 backend            # NestJS API
│   └── Port: 3000
│
├── 🎨 frontend           # React Web
│   └── Port: 5173
│
└── 🗂️ pgadmin (opcional) # PgAdmin 4
    └── Port: 5050
```

---

## 📚 Documentação

```
docs/
│
├── 📄 QUICK-START.md         # Início rápido
├── 📄 DATABASE.md            # Schema do banco
├── 📄 API-INTEGRATION.md     # Guia de integração API
├── 📄 ARCHITECTURE.md        # Arquitetura (a criar)
└── 📁 postman/               # Collections Postman
    └── Sys-Ticket.postman_collection.json
```

---

## 🔑 Arquivos de Configuração

```
Raiz do projeto:
│
├── 📄 package.json           # Workspace root
├── 📄 .gitignore
├── 📄 .prettierrc            # Prettier config
├── 📄 .eslintrc.json         # ESLint config
├── 📄 .lintstagedrc.json     # Lint-staged
├── 📄 docker-compose.yml     # Docker Compose
├── 📄 README.md              # Documentação principal
├── 📄 NEXT-STEPS.md          # Próximos passos
├── 📄 PROJECT-STRUCTURE.md   # Este arquivo
│
└── 📁 .husky/                # Git hooks
    └── pre-commit
```

---

## 🌐 Endpoints Principais da API

```
Base URL: http://localhost:3000/api/v1

Autenticação:
├── POST   /auth/login
├── POST   /auth/refresh
└── POST   /auth/logout

Tickets:
├── GET    /tickets
├── POST   /tickets
├── GET    /tickets/:id
├── PATCH  /tickets/:id
├── DELETE /tickets/:id
├── POST   /tickets/:id/close
└── POST   /tickets/:id/invoice/create

Clientes (SIGE):
├── GET    /clients/search
├── GET    /clients/:id
└── GET    /clients/:id/contracts

Apontamentos:
├── GET    /tickets/:id/timesheets
├── POST   /tickets/:id/timesheets
├── POST   /timesheets/:id/start
├── POST   /timesheets/:id/pause
└── POST   /timesheets/:id/stop

Sincronização:
├── POST   /sync/pull
└── POST   /sync/push

Documentação:
└── GET    /docs (Swagger UI)
```

---

## 📊 Fluxo de Dados

```
┌─────────────┐
│   Cliente   │
│   (Web/App) │
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌─────────────┐
│   Backend   │
│   (NestJS)  │
└──────┬──────┘
       │
       ├──► PostgreSQL (dados principais)
       ├──► Redis (cache, filas)
       ├──► SIGE Cloud API (clientes, contratos, OS)
       └──► n8n (webhooks)
```

---

## 🎯 Convenções de Código

### Nomenclatura

- **Arquivos**: kebab-case (`user.entity.ts`)
- **Classes**: PascalCase (`UserEntity`)
- **Funções/Variáveis**: camelCase (`getUserById`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Interfaces**: PascalCase com I prefix (`IUser`)
- **Types**: PascalCase (`UserRole`)

### Estrutura de Commits

```
feat: adiciona autenticação JWT
fix: corrige bug no fechamento de ticket
docs: atualiza README com instruções
refactor: melhora estrutura do módulo de tickets
test: adiciona testes para apontamentos
chore: atualiza dependências
```

---

**Última atualização**: 2025-01-03
