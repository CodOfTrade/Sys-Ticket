# Guia de Configuração - Desenvolvimento Local (Windows)

## Pré-requisitos

### 1. Instalar Node.js
1. Acesse: https://nodejs.org/
2. Baixe a versão LTS (Long Term Support) - recomendado versão 20.x
3. Execute o instalador e siga as instruções
4. Reinicie o terminal após a instalação

### 2. Instalar PostgreSQL
1. Acesse: https://www.postgresql.org/download/windows/
2. Baixe o instalador
3. Durante a instalação:
   - Defina uma senha para o usuário `postgres` (ex: `123321`)
   - Porta padrão: `5432`
   - Locale: `Portuguese, Brazil`

### 3. Instalar Redis (Opcional para Windows)
**Opção 1: Docker Desktop (Recomendado)**
1. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop
2. Execute: `docker run -d -p 6379:6379 redis:alpine`

**Opção 2: WSL2**
1. Instale o WSL2: `wsl --install`
2. No terminal WSL: `sudo apt-get install redis-server`

## Configuração do Projeto

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/sys-ticket.git
cd sys-ticket
```

### 2. Instalar Dependências
```bash
# Instalar dependências do backend
npm install --workspace=apps/backend

# Instalar dependências do frontend
npm install --workspace=apps/frontend
```

### 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na pasta `apps/backend`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123321
DB_DATABASE=sys_ticket

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=seu-secret-key-super-seguro-aqui
JWT_EXPIRES_IN=7d

# API
PORT=3000
NODE_ENV=development

# SIGE Cloud (opcional para desenvolvimento)
SIGE_API_URL=https://api.sigecloud.com.br
SIGE_API_KEY=sua-chave-aqui
```

### 4. Criar Banco de Dados

Abra o pgAdmin ou psql e execute:

```sql
CREATE DATABASE sys_ticket;
```

Ou via linha de comando:

```bash
# No terminal (se psql estiver no PATH)
psql -U postgres -c "CREATE DATABASE sys_ticket;"
```

### 5. Executar Migrações

```bash
cd apps/backend
npm run migration:run
```

### 6. Iniciar o Backend

```bash
cd apps/backend
npm run start:dev
```

O servidor estará disponível em: http://localhost:3000

### 7. Acessar Documentação da API

Abra no navegador: http://localhost:3000/api/docs

## Iniciar o Frontend

Em outro terminal:

```bash
cd apps/frontend
npm run dev
```

O frontend estará disponível em: http://localhost:5173

## Comandos Úteis

### Backend
```bash
# Modo desenvolvimento (com hot-reload)
npm run start:dev

# Modo produção
npm run build
npm run start:prod

# Criar nova migration
npm run migration:create -- src/migrations/NomeDaMigration

# Executar migrations
npm run migration:run

# Reverter última migration
npm run migration:revert
```

### Frontend
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Troubleshooting

### Erro: "npm: command not found"
- Certifique-se de que o Node.js está instalado
- Reinicie o terminal
- Verifique com: `node --version` e `npm --version`

### Erro de conexão com PostgreSQL
- Verifique se o PostgreSQL está rodando
- Confirme usuário e senha no arquivo `.env`
- Teste a conexão: `psql -U postgres -d sys_ticket`

### Erro de conexão com Redis
- Se usando Docker: `docker ps` para verificar se está rodando
- Se usando WSL: `sudo service redis-server start`

### Porta 3000 já em uso
- Windows: `netstat -ano | findstr :3000`
- Encerre o processo: `taskkill /PID <numero_do_pid> /F`
- Ou mude a porta no `.env`

## Estrutura de Pastas

```
sys-ticket/
├── apps/
│   ├── backend/          # API NestJS
│   │   ├── src/
│   │   ├── dist/         # Build de produção
│   │   └── package.json
│   ├── frontend/         # React + Vite
│   └── mobile/           # React Native + Expo
├── docs/                 # Documentação
└── package.json          # Workspace root
```

## Próximos Passos

1. Implementar autenticação JWT
2. Integrar com SIGE Cloud API
3. Desenvolver interface do usuário
4. Configurar webhooks para n8n
5. Implementar sincronização offline (mobile)

## Links Úteis

- [Documentação NestJS](https://docs.nestjs.com/)
- [Documentação React](https://react.dev/)
- [Documentação TypeORM](https://typeorm.io/)
- [Documentação Vite](https://vitejs.dev/)
- [API SIGE Cloud](https://api.sigecloud.com.br/docs)
