# Sys-Ticket - Contexto do Projeto

## 📋 Sobre o Projeto

Sistema de gerenciamento de tickets de suporte técnico integrado com SIGE Cloud (sistema de gestão).

**Repositório Git**: https://github.com/CodOfTrade/Sys-Ticket.git

## 🏗️ Arquitetura

### Monorepo Structure
```
Sys-Ticket/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite + TypeScript
└── packages/            # Shared packages
```

### Stack Tecnológica

**Backend:**
- NestJS (Node.js framework)
- TypeORM
- PostgreSQL
- JWT Auth (com guard global)
- API Versionada (URI versioning - v1)
- Swagger/OpenAPI docs

**Frontend:**
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- React Router
- Tailwind CSS
- Lucide Icons

## 🌐 Servidor de Produção

### Informações de Acesso
- **IP**: 172.31.255.26
- **Usuário SSH**: root
- **Senha SSH**: 123321
- **URL Frontend**: http://172.31.255.26
- **URL Backend**: http://172.31.255.26/api
- **Swagger Docs**: http://172.31.255.26/api/docs

### Estrutura de Diretórios no Servidor

```bash
/root/Sys-Ticket/                    # Repositório Git (código-fonte)
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
    ├── index-*.css
    └── index-*.js
```

### Serviços Rodando

**Backend (PM2):**
```bash
pm2 list                    # Listar processos
pm2 logs backend            # Ver logs
pm2 restart backend         # Reiniciar
```
- Nome do processo: `backend`
- Porta: 3000 (localhost)
- Status: online

**Frontend (nginx):**
```bash
systemctl status nginx      # Status
systemctl reload nginx      # Recarregar config
nginx -t                   # Testar config
```
- Config: `/etc/nginx/sites-available/sys-ticket`
- Root: `/var/www/sys-ticket`
- Porta: 80

**Banco de Dados (PostgreSQL):**
```bash
# Acesso local no servidor
PGPASSWORD='123321' psql -U sys_ticket -d sys_ticket_db -h localhost
```
- Host: localhost (no servidor) / 172.31.255.26 (remoto)
- Porta: 5432
- Usuário: sys_ticket
- Senha: 123321
- Database: sys_ticket_db

## 🔄 Workflow de Deploy

### 1. Desenvolvimento Local (Windows)
```bash
cd "d:\Arquivos do Usuário\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket"

# Fazer alterações nos arquivos
# Commitar e push
git add .
git commit -m "Mensagem"
git push
```

### 2. Deploy no Servidor

**Backend:**
```bash
ssh root@172.31.255.26
cd /root/Sys-Ticket
git pull
cd apps/backend
npm run build          # Compila TypeScript -> dist/
pm2 restart backend    # Reinicia processo
```

**Frontend:**
```bash
ssh root@172.31.255.26
cd /root/Sys-Ticket
git pull
cd apps/frontend
npm run build                              # Gera dist/
rm -rf /var/www/sys-ticket/*              # Limpa diretório nginx
cp -r dist/* /var/www/sys-ticket/         # Copia build
```

**IMPORTANTE:** Sempre usar git push local → git pull no servidor. NÃO fazer alterações diretas no servidor com sed/vim a menos que seja temporário para debug.

## 🔐 Autenticação

### Sistema de Auth Global
- **Guard Global**: JwtAuthGuard (APP_GUARD no app.module.ts)
- **Decorator @Public()**: Usado para endpoints que NÃO precisam de autenticação
- **Localização**: `apps/backend/src/modules/auth/decorators/public.decorator.ts`

### Endpoints Públicos (com @Public())
```typescript
// Exemplo de uso:
@Get()
@Public()
async findAll() { }
```

**Endpoints já configurados como públicos:**
- `GET /api/v1/service-catalog` - Listar catálogos
- `GET /api/v1/tickets` - Listar tickets
- `GET /api/v1/tickets/:id` - Buscar ticket por ID
- `POST /api/v1/tickets` - Criar ticket
- `GET /api/v1/clients` - Listar clientes
- `GET /api/v1/clients/search` - Buscar clientes
- `GET /api/v1/clients/contacts` - Listar contatos
- `POST /api/v1/clients/contacts` - Criar contato
- Outros endpoints de clients/contacts (CRUD completo)

## 📊 Banco de Dados

### Principais Tabelas

**tickets:**
- Sistema principal de tickets
- Relaciona com: users, service_desks, clients (SIGE), contracts (SIGE)

**service_catalogs:**
- 8 catálogos cadastrados (Backup, Rede, Impressoras, Hardware, Suporte Remoto, etc)
- service_desk_id: `3d316765-6615-4082-9bb7-d7d6a266db09`

**service_desks:**
- Mesa de serviço principal: "Suporte Técnico"
- ID: `3d316765-6615-4082-9bb7-d7d6a266db09`

**users:**
- Usuário técnico exemplo: "Técnico Exemplo - tecnico@example.com"
- ID: `5d5b0a62-e8cf-484c-9338-47858b7e72ce`

**client_contacts:**
- Contatos de clientes (nome, email, telefone, departamento, cargo)
- Relacionado com clients via client_id (SIGE Cloud)

### Integração SIGE Cloud
- Clientes vêm da API SIGE Cloud (não armazenados localmente)
- Contratos vêm da API SIGE Cloud
- Sincronização via `SigeSyncService`

## 🐛 Problemas Resolvidos Recentemente

1. ✅ Campo `assigned_to` → `assigned_to_id` no CreateTicketDto
2. ✅ Adicionados campos `service_catalog_id` e `contact_id` no DTO backend
3. ✅ Criados catálogos de serviço reais no banco (substituindo examples)
4. ✅ Endpoint `/api/v1/service-catalog` retornando 404 → Adicionado @Public()
5. ✅ Nginx apontando para diretório errado → Corrigido para `/var/www/sys-ticket`
6. ✅ Endpoints de tickets retornando 401 → Adicionado @Public()
7. ✅ Frontend enviando `limit` mas backend espera `perPage` → Corrigido
8. ✅ Formatação automática de telefone brasileiro (DDD + 8/9 dígitos)
9. ✅ Modal de criação de ticket funcionando com todos os campos

## 📝 Padrões de Código

### Backend (NestJS)

**Controller:**
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller({ path: 'resource', version: '1' })
export class ResourceController {

  @Get()
  @Public()  // Se não precisa auth
  async findAll() {
    return { success: true, data: [] };
  }
}
```

**DTO com validação:**
```typescript
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  field?: string;
}
```

### Frontend (React)

**Service (API):**
```typescript
import { api } from './api';

export const resourceService = {
  async getAll(params?: { page?: number; perPage?: number }) {
    const response = await api.get('/v1/resource', { params });
    return response.data;
  }
};
```

**Component com TanStack Query:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['resource'],
  queryFn: () => resourceService.getAll(),
});
```

## 🔍 Comandos Úteis

### Git
```bash
# Local (Windows)
cd "d:\Arquivos do Usuário\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket"
git status
git log --oneline -10
git diff

# Servidor
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git log --oneline -5"
```

### SSH Direto
```bash
ssh root@172.31.255.26 "comando aqui"
```

### PM2
```bash
pm2 list
pm2 logs backend --lines 50
pm2 restart backend
pm2 status
```

### PostgreSQL
```bash
# Listar tabelas
ssh root@172.31.255.26 "PGPASSWORD='123321' psql -U sys_ticket -d sys_ticket_db -c '\dt'"

# Query
ssh root@172.31.255.26 "PGPASSWORD='123321' psql -U sys_ticket -d sys_ticket_db -c 'SELECT * FROM service_catalogs;'"
```

### Nginx
```bash
nginx -t                    # Testar config
systemctl reload nginx      # Recarregar
cat /etc/nginx/sites-available/sys-ticket  # Ver config
```

### Build e Deploy Completo
```bash
# Backend
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/backend && npm run build && pm2 restart backend"

# Frontend
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/frontend && npm run build && rm -rf /var/www/sys-ticket/* && cp -r dist/* /var/www/sys-ticket/"
```

## 🎯 Próximos Passos / TODOs

- [ ] Implementar sistema de autenticação completo (login/logout)
- [ ] Adicionar tela de configuração para cadastro de service catalogs
- [ ] Melhorar tratamento de erros no frontend
- [ ] Adicionar testes unitários
- [ ] Configurar HTTPS com certificado SSL
- [ ] Implementar paginação completa na listagem de tickets
- [ ] Adicionar filtros avançados na listagem

## 📞 Funcionalidades Principais

### ✅ Implementadas e Funcionando

1. **Criação de Tickets**
   - Modal com formulário completo
   - Seleção de cliente (busca na API SIGE Cloud)
   - Cadastro rápido de solicitante/contato
   - Formatação automática de telefone
   - Seleção de catálogo de serviço (dropdown)
   - Atribuição opcional a técnico
   - Upload de arquivos (estrutura pronta)
   - Followers e ticket pai (estrutura pronta)

2. **Listagem de Tickets**
   - Grid com todos os tickets
   - Filtros por status e prioridade
   - Busca por título/número
   - Estatísticas (total, abertos, em andamento, resolvidos)
   - Paginação

3. **Integração SIGE Cloud**
   - Busca de clientes
   - Busca de contratos
   - Sincronização de dados

4. **Gestão de Contatos**
   - CRUD completo de contatos de clientes
   - Campos: nome, email, telefone, departamento, cargo

## 🚨 Avisos Importantes

1. **NÃO fazer alterações diretas no servidor** - sempre usar Git workflow
2. **Sempre testar endpoints** antes de fazer deploy frontend
3. **Usar @Public()** em endpoints que não precisam auth
4. **Backend usa `perPage`**, não `limit` para paginação
5. **Frontend deve corresponder** aos DTOs do backend exatamente
6. **Nginx serve apenas arquivos estáticos** - API proxy para localhost:3000

---

## 📌 Quick Start para Nova Conversa

```markdown
Estou trabalhando no projeto Sys-Ticket, um sistema de tickets integrado com SIGE Cloud.

**Servidor**: 172.31.255.26 (root/123321)
**Código Local**: d:\Arquivos do Usuário\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket
**Repositório**: https://github.com/CodOfTrade/Sys-Ticket.git

**Backend**: NestJS rodando no PM2 (processo "backend") na porta 3000
**Frontend**: React servido pelo nginx em /var/www/sys-ticket na porta 80
**Banco**: PostgreSQL (sys_ticket/123321@localhost:5432/sys_ticket_db)

**Workflow**: git push local → ssh servidor → git pull → build → deploy

**Contexto Atual**: [Descrever o que você está fazendo]
```
