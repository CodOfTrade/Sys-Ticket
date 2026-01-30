# Módulos de Filas e SLA - Documentação Técnica

**Data:** 2026-01-30
**Status:** ✅ Completo - Pronto para Deploy

---

## 📦 Componentes Criados

### 1. Filas (Queues)
```
apps/frontend/src/components/Settings/
├── QueueSettings.tsx       (150 linhas) - Lista e gerencia filas
├── QueueCard.tsx           (180 linhas) - Card individual expansível
├── CreateQueueModal.tsx    (310 linhas) - Modal de criação
└── EditQueueModal.tsx      (310 linhas) - Modal de edição
```

### 2. SLA
```
apps/frontend/src/components/Settings/
└── SlaSettings.tsx         (510 linhas) - Configuração completa
```

### 3. Integração
```
apps/frontend/src/components/Settings/
└── TicketSettingsContainer.tsx (modificado) - Integra os componentes
```

**Total:** ~1.460 linhas de código

---

## 🚀 Deploy - Passo a Passo

### PASSO 1: Teste Local
```bash
cd "c:\Users\josed\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket\apps\frontend"
npm run dev
# Testar: http://localhost:5173
# Navegar: Configurações → Tickets → Filas/SLA
```

### PASSO 2: Commit
```bash
cd "c:\Users\josed\OneDrive\3 - Pessoal José\Programaçao\Sys-Ticket"
git add .
git commit -m "Feat: UI completa de Filas e SLA

- Adiciona QueueSettings com CRUD
- Adiciona modais Create/Edit
- Adiciona SlaSettings
- Integra no TicketSettingsContainer"

git push origin main
```

### PASSO 3: Deploy Servidor
```bash
ssh root@172.31.255.26
cd /root/Sys-Ticket
git pull
cd apps/frontend
npm run build
rm -rf /var/www/sys-ticket/*
cp -r dist/* /var/www/sys-ticket/
```

### PASSO 4: Testar
- Acessar: https://172.31.255.26
- Login → Configurações → Tickets
- Testar Filas: criar, editar, deletar
- Testar SLA: configurar e salvar

---

## 🎯 Funcionalidades

### Filas
- ✅ Listar filas (4 padrão do seed)
- ✅ Criar nova fila
- ✅ Editar fila existente
- ✅ Ativar/desativar fila
- ✅ Deletar fila
- ✅ Seleção de membros
- ✅ 4 estratégias de distribuição
- ✅ Atribuição automática
- ✅ Seletor de cores

### SLA
- ✅ Habilitar/desabilitar SLA
- ✅ Horário comercial (início/fim)
- ✅ Dias úteis (checkboxes)
- ✅ 3 fusos horários BR
- ✅ 4 prioridades configuráveis
- ✅ Primeira resposta (minutos)
- ✅ Resolução (minutos)
- ✅ Preview em horas/minutos

---

## 📊 Arquitetura

### Fluxo de Dados
```
Component → Service → API (Backend)
           ↓
     State (useState)
           ↓
     UI Update + Toast
```

### Services Utilizados
- `queueService` - CRUD de filas
- `slaService` - Config de SLA
- `userService` - Lista usuários (membros)
- `useAuthStore` - Service desk do usuário

### Backend Endpoints
```
GET    /v1/queues
POST   /v1/queues
PATCH  /v1/queues/:id
DELETE /v1/queues/:id

GET   /v1/sla/service-desks/:id/config
PATCH /v1/sla/service-desks/:id/config
```

---

## 🔍 Checklist de Testes

### Local (Windows)
- [ ] Componentes renderizam
- [ ] Criar fila funciona
- [ ] Editar fila funciona
- [ ] Deletar fila funciona
- [ ] SLA salva e persiste

### Servidor (Linux)
- [ ] Build sem erros
- [ ] Deploy concluído
- [ ] Site acessível (https)
- [ ] Filas padrão listadas
- [ ] CRUD funciona
- [ ] SLA funciona
- [ ] Dados persistem no banco

### Banco de Dados
```sql
-- Verificar filas
SELECT id, name, distribution_strategy, is_active FROM queues;

-- Verificar membros
SELECT q.name, u.name FROM queue_members qm
JOIN queues q ON q.id = qm.queue_id
JOIN users u ON u.id = qm.user_id;

-- Verificar SLA
SELECT service_desk_id, sla_config FROM service_desks
WHERE sla_config IS NOT NULL;
```

---

## 🐛 Troubleshooting

### Build Falha
```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build
```

### Componentes Não Aparecem
```bash
# Verificar arquivos copiados
ls -la /var/www/sys-ticket/

# Verificar nginx
systemctl status nginx
systemctl reload nginx
```

### API Retorna 404
```bash
# Verificar backend
pm2 status
pm2 logs sys-ticket-api

# Reiniciar se necessário
pm2 restart sys-ticket-api
```

---

## 📝 Próximos Passos

### Imediato
1. ✅ Criar componentes
2. ⏳ Testar local
3. ⏳ Deploy servidor
4. ⏳ Testes funcionais

### Futuro (Melhorias)
- Dashboard de métricas SLA
- Indicadores visuais em tickets
- Notificações de violação
- Drag & drop para reordenar filas
- Relatórios exportáveis

---

## 🎉 Resumo

**Implementação:** 100% Completa
**Backend:** Já estava pronto
**Frontend:** Pronto nesta sessão
**Integração:** Completa

**Ação Necessária:** Executar deploy (Passos 1-4 acima)
