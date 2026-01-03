# 🚀 Quick Start - Sys-Ticket

Guia rápido para começar a desenvolver no Sys-Ticket em menos de 5 minutos.

## ⚡ Início Rápido

### 1. Pré-requisitos

Certifique-se de ter instalado:
- Node.js 18+
- Docker Desktop
- Git

### 2. Clone e Instale

```bash
git clone https://github.com/seu-usuario/sys-ticket.git
cd sys-ticket
npm install
```

### 3. Configure o Ambiente

```bash
# Copie o arquivo de exemplo
cp apps/backend/.env.example apps/backend/.env

# Edite apenas estas variáveis essenciais:
# - DB_PASSWORD=sua_senha_aqui
# - JWT_SECRET=sua_chave_secreta_jwt
# - SIGE_CLOUD_API_KEY=sua_chave_sige
```

### 4. Inicie os Serviços

```bash
# Suba PostgreSQL e Redis
docker-compose up -d postgres redis

# Execute migrations
npm run db:migrate

# (Opcional) Popule com dados de teste
npm run db:seed
```

### 5. Inicie a Aplicação

```bash
# Inicia backend + frontend simultaneamente
npm run dev
```

Pronto! 🎉

**Acesse:**
- Frontend: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

## 🔑 Credenciais de Teste

**Admin:**
- Email: `admin@sys-ticket.com`
- Senha: `admin123`

**Técnico:**
- Email: `tecnico@sys-ticket.com`
- Senha: `tecnico123`

## 📱 Desenvolvimento Mobile

```bash
cd apps/mobile
npm install
npm start

# Escolha:
# - 'a' para Android
# - 'i' para iOS
# - 'w' para Web
```

## 🐛 Problemas Comuns

### PostgreSQL não conecta
```bash
# Verifique se o container está rodando
docker-compose ps

# Reinicie o container
docker-compose restart postgres
```

### Porta 3000 já em uso
```bash
# Altere no apps/backend/.env
PORT=3001
```

### Migrations não executam
```bash
# Force recriar o banco
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Backend + Frontend
npm run dev:backend      # Apenas Backend
npm run dev:frontend     # Apenas Frontend
npm run dev:mobile       # App Mobile

# Docker
npm run docker:up        # Inicia todos containers
npm run docker:down      # Para todos containers
npm run docker:logs      # Ver logs

# Banco de Dados
npm run db:migrate       # Executa migrations
npm run db:seed          # Popula dados de teste

# Qualidade de Código
npm run lint             # ESLint
npm run format           # Prettier
npm test                 # Testes unitários
```

## 📚 Próximos Passos

1. Leia o [README.md](../README.md) completo
2. Explore a [Documentação da API](http://localhost:3000/api/docs)
3. Veja a [Arquitetura do Sistema](./ARCHITECTURE.md)
4. Consulte o [Schema do Banco](./DATABASE.md)

## 💡 Dicas

- Use o Swagger UI para testar endpoints
- Habilite hot-reload (já configurado)
- Instale extensões VS Code recomendadas
- Configure ESLint no seu editor

---

Precisa de ajuda? Abra uma issue ou contate o time! 🚀
