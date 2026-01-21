# Sys-Ticket - Contexto do Projeto

## IMPORTANTE - Leia Sempre

Este arquivo contém informações críticas que o Claude deve lembrar em TODAS as interações.

---

## Ambiente de Desenvolvimento

| Ambiente | Sistema | Caminho |
|----------|---------|---------|
| **Desenvolvimento** | Windows | `d:\Arquivos do Usuário\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket` |
| **Servidor/Deploy** | Linux Ubuntu | `/root/Sys-Ticket` |

**Workflow**: Desenvolve no Windows → git push → git pull no servidor Linux → build → deploy

---

## Servidor de Desenvolvimento/Testes

| Item | Valor |
|------|-------|
| **IP** | 172.31.255.26 |
| **SSH** | `ssh root@172.31.255.26` (senha: 123321) |
| **Frontend** | https://172.31.255.26 |
| **Backend API** | https://172.31.255.26/api |
| **Swagger** | https://172.31.255.26/api/docs |

---

## Banco de Dados PostgreSQL

| Item | Valor |
|------|-------|
| **Host** | localhost (no servidor) |
| **Porta** | 5432 |
| **Usuario** | sys_ticket |
| **Senha** | sys_ticket_dev_password |
| **Database** | sys_ticket_db |

```bash
# Acesso ao banco no servidor
PGPASSWORD='sys_ticket_dev_password' psql -U sys_ticket -d sys_ticket_db -h localhost
```

---

## Comandos de Deploy Rápido

**Backend:**
```bash
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/backend && npm run build && pm2 restart sys-ticket-api"
```

**Frontend:**
```bash
ssh root@172.31.255.26 "cd /root/Sys-Ticket && git pull && cd apps/frontend && npm run build && rm -rf /var/www/sys-ticket/* && cp -r dist/* /var/www/sys-ticket/"
```

---

## Estrutura do Projeto

- **Backend**: NestJS + TypeScript + PostgreSQL + TypeORM
- **Frontend**: React 18 + Vite + TailwindCSS + Zustand
- **Mobile**: React Native + Expo (em desenvolvimento)

---

## Serviços no Servidor

| Serviço | Gerenciador | Comandos |
|---------|-------------|----------|
| Backend | PM2 | `pm2 logs sys-ticket-api`, `pm2 restart sys-ticket-api` |
| Frontend | nginx | `systemctl reload nginx` |
| Banco | PostgreSQL | Serviço do sistema |

---

## Regras de Desenvolvimento

1. **NUNCA** editar arquivos diretamente no servidor - sempre via git
2. **SEMPRE** testar localmente antes de fazer deploy
3. **SEMPRE** verificar logs após deploy: `pm2 logs backend --lines 50`
4. Endpoints públicos usam decorator `@Public()`
5. Backend usa `perPage` (não `limit`) para paginação
