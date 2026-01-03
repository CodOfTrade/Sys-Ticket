# 🎫 Sys-Ticket - Sistema de Gestão de Tickets

Sistema web completo e escalável de gestão de tickets e atendimento ao cliente, com arquitetura moderna, app mobile offline e integração nativa com SIGE Cloud.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura Técnica](#-arquitetura-técnica)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Documentação da API](#-documentação-da-api)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)

## 🚀 Visão Geral

O Sys-Ticket é um sistema completo de gestão de atendimentos que gerencia todo o ciclo de vida de tickets, desde a abertura até o faturamento integrado com SIGE Cloud.

### Diferenciais

✅ **Integração SIGE Cloud**: Consulta de clientes, contratos e criação automática de OS
✅ **App Mobile Offline**: Funciona sem internet, com sincronização inteligente
✅ **Assinatura Digital**: Coleta de assinatura em tela touch
✅ **Precificação Inteligente**: Baseada em contratos consultados do SIGE
✅ **API REST Completa**: Documentada com Swagger, pronta para integrações
✅ **Webhooks para n8n**: Automações externas via eventos

## ✨ Funcionalidades Principais

### Gestão de Tickets
- Criação e acompanhamento de tickets
- Múltiplos status e workflows personalizáveis
- SLA configurável por mesa de serviço
- Vinculação de tickets (pai/filho)
- Anexos, fotos e evidências
- Histórico completo de ações

### Integração SIGE Cloud
- **Clientes**: Consulta via API (somente leitura)
- **Contratos**: Consulta completa com avisos automáticos
- **Faturamento**: Criação de OS ao fechar ticket
- **Precificação**: Consumo de contratos ou cobrança avulsa

### App Mobile
- Modo offline completo
- Assinatura digital em canvas
- Captura de fotos com GPS
- Apontamentos de tempo
- Sincronização bidirecional
- Check-in/Check-out por GPS

### Apontamentos e Precificação
- Timer play/pause integrado
- Valorização automática por tipo de contrato
- Deslocamentos com cálculo de km
- Gastos extras (materiais, pedágio, etc)
- Aprovação de cobranças não cobertas

### Portal do Cliente
- Abertura de tickets
- Acompanhamento em tempo real
- Histórico de atendimentos
- Visualização de contratos
- Avaliação de tickets

## 🏗️ Arquitetura Técnica

### Backend
- **Framework**: NestJS + TypeScript
- **Banco de Dados**: PostgreSQL + TypeORM
- **Cache**: Redis
- **API**: RESTful com Swagger/OpenAPI
- **Autenticação**: JWT com refresh tokens
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
- **Geolocalização**: Expo Location
- **Câmera/Fotos**: Expo Camera/Image Picker
- **Assinatura**: React Native Signature Canvas

### Infraestrutura
- **Containerização**: Docker + Docker Compose
- **CI/CD**: GitHub Actions (planejado)
- **Cloud**: AWS/Azure/GCP ready

## 📦 Pré-requisitos

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **Docker**: >= 24.x
- **Docker Compose**: >= 2.x
- **PostgreSQL**: 16+ (via Docker)
- **Redis**: 7+ (via Docker)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/sys-ticket.git
cd sys-ticket
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env

# Edite o arquivo apps/backend/.env com suas configurações
```

### 4. Inicie os serviços com Docker

```bash
# Inicia PostgreSQL e Redis
docker-compose up -d postgres redis

# Aguarde os serviços iniciarem (healthcheck)
docker-compose ps
```

### 5. Execute as migrations

```bash
npm run db:migrate
```

### 6. (Opcional) Popule o banco com dados de teste

```bash
npm run db:seed
```

## ▶️ Uso

### Desenvolvimento

**Iniciar todos os serviços:**
```bash
npm run dev
```

**Iniciar serviços individualmente:**
```bash
# Backend (http://localhost:3000)
npm run dev:backend

# Frontend (http://localhost:5173)
npm run dev:frontend

# Mobile (Expo)
npm run dev:mobile
```

**Com Docker (ambiente completo):**
```bash
docker-compose up
```

### Acessar a aplicação

- **Frontend Web**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **PgAdmin** (opcional): http://localhost:5050

### Credenciais padrão (ambiente dev)

**Usuário Admin:**
- Email: `admin@sys-ticket.com`
- Senha: `admin123`

**Banco de Dados (PgAdmin):**
- Email: `admin@sys-ticket.com`
- Senha: `admin123`

## 📚 Documentação da API

A documentação completa da API está disponível via Swagger:

**URL**: http://localhost:3000/api/docs

### Principais Endpoints

```
Autenticação
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

Clientes (SIGE Cloud)
GET    /api/v1/clients/search
GET    /api/v1/clients/{id}
GET    /api/v1/clients/{id}/contracts

Tickets
GET    /api/v1/tickets
POST   /api/v1/tickets
GET    /api/v1/tickets/{id}
PATCH  /api/v1/tickets/{id}
POST   /api/v1/tickets/{id}/close
POST   /api/v1/tickets/{id}/invoice/create

Apontamentos
POST   /api/v1/tickets/{id}/timesheets
POST   /api/v1/timesheets/{id}/start
POST   /api/v1/timesheets/{id}/pause

Assinaturas
POST   /api/v1/tickets/{id}/signatures
GET    /api/v1/signatures/{id}/download

Sincronização
POST   /api/v1/sync/pull
POST   /api/v1/sync/push
```

## 📁 Estrutura do Projeto

```
sys-ticket/
├── apps/
│   ├── backend/          # API NestJS
│   │   ├── src/
│   │   │   ├── modules/  # Módulos (tickets, users, etc)
│   │   │   ├── shared/   # Código compartilhado
│   │   │   ├── config/   # Configurações
│   │   │   └── database/ # Migrations e seeds
│   │   └── package.json
│   │
│   ├── frontend/         # Web React + Vite
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── store/
│   │   └── package.json
│   │
│   └── mobile/           # App React Native
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── services/
│       │   └── database/ # SQLite offline
│       └── package.json
│
├── packages/
│   └── shared/           # Código compartilhado (tipos, utils)
│
├── docker/               # Arquivos Docker
│   ├── init-db.sql
│   └── docker-compose.yml
│
├── docs/                 # Documentação adicional
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
│
└── package.json          # Root workspace
```

## 🗺️ Roadmap

### Fase 1 - MVP ✅ (Em desenvolvimento)
- [x] Estrutura do projeto
- [x] Autenticação JWT
- [ ] CRUD de Tickets
- [ ] Integração SIGE Cloud (clientes/contratos)
- [ ] Apontamentos de tempo
- [ ] Precificação básica
- [ ] API REST documentada

### Fase 2 - App Mobile (Próximo)
- [ ] App React Native
- [ ] Modo offline completo
- [ ] Assinatura digital
- [ ] Captura de fotos
- [ ] Sincronização bidirecional

### Fase 3 - Consolidação
- [ ] Relatórios avançados
- [ ] Dashboards completos
- [ ] Portal do cliente
- [ ] Base de conhecimento
- [ ] Webhooks para n8n

### Fase 4 - Expansão
- [ ] Gestão de ativos
- [ ] IA para sugestões
- [ ] Chatbot
- [ ] Integrações premium

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, siga os passos:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário e confidencial. Todos os direitos reservados.

## 📞 Suporte

Para questões ou suporte:
- **Email**: suporte@sys-ticket.com
- **Documentação**: http://localhost:3000/api/docs
- **Issues**: https://github.com/seu-usuario/sys-ticket/issues

---

Desenvolvido com ❤️ pela equipe Sys-Ticket
#   S y s - T i c k e t  
 