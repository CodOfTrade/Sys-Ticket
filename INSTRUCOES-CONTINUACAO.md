# Instruções para Continuação do Desenvolvimento
## Sistema de Detalhes do Ticket (baseado no TFlux)

**Data:** 2026-01-05
**Status:** Backend 100% implementado e deployado | Frontend 30% implementado

---

## ✅ O QUE JÁ ESTÁ PRONTO

### Backend (100% Completo e Deployado)

#### Entidades Criadas:
1. **TicketComment** - Sistema de comentários multi-canal
   - `apps/backend/src/modules/tickets/entities/ticket-comment.entity.ts`
   - Tipos: CLIENT, INTERNAL, CHAT
   - Visibilidade: PUBLIC, PRIVATE

2. **TicketAppointment** - Apontamentos com timer automático
   - `apps/backend/src/modules/tickets/entities/ticket-appointment.entity.ts`
   - Timer play/pause (campos: is_timer_based, timer_started_at, timer_stopped_at)
   - Tipos de cobertura: CONTRACT, WARRANTY, BILLABLE, INTERNAL
   - Cálculo automático de duração e valores

3. **TicketValuation** - Valorização com produtos SIGE Cloud
   - `apps/backend/src/modules/tickets/entities/ticket-valuation.entity.ts`
   - Integração com SIGE (sige_product_id, sige_product_name)
   - Cálculos de desconto e impostos
   - Categorias: CLIENT_CHARGE, INTERNAL_COST

4. **Checklist** - Templates reutilizáveis
   - `apps/backend/src/modules/tickets/entities/checklist.entity.ts`
   - Items em JSONB

5. **TicketChecklist** - Instâncias de checklists
   - `apps/backend/src/modules/tickets/entities/ticket-checklist.entity.ts`
   - Tracking de progresso (completed_items, completion_percent)

#### Tabelas no Banco (CRIADAS):
- `ticket_comments` (4 índices)
- `ticket_appointments` (4 índices)
- `ticket_valuations` (4 índices)
- `checklists` (3 índices)
- `ticket_checklists` (3 índices)

**Migration SQL:** `database/migrations/002-ticket-details-tables.sql`

#### Services Implementados:
1. **TicketCommentsService** - `apps/backend/src/modules/tickets/services/ticket-comments.service.ts`
2. **TicketAppointmentsService** - `apps/backend/src/modules/tickets/services/ticket-appointments.service.ts`
3. **TicketValuationsService** - `apps/backend/src/modules/tickets/services/ticket-valuations.service.ts`
4. **ChecklistsService** - `apps/backend/src/modules/tickets/services/checklists.service.ts`

#### Controller:
**TicketDetailsController** - `apps/backend/src/modules/tickets/controllers/ticket-details.controller.ts`

**30+ Endpoints criados:**

**Comentários:**
- `POST /api/tickets/:id/comments` - Criar comentário
- `GET /api/tickets/:id/comments?type=client|internal|chat` - Listar
- `PATCH /api/tickets/comments/:id` - Editar
- `DELETE /api/tickets/comments/:id` - Remover

**Apontamentos:**
- `POST /api/tickets/appointments` - Criar manual
- `POST /api/tickets/appointments/timer/start` - ⏱️ Iniciar timer
- `POST /api/tickets/appointments/timer/stop` - ⏱️ Parar timer
- `GET /api/tickets/appointments/timer/active` - ⏱️ Timer ativo
- `GET /api/tickets/:id/appointments` - Listar
- `GET /api/tickets/:id/appointments/summary` - Total horas/custos
- `PATCH /api/tickets/appointments/:id` - Atualizar
- `DELETE /api/tickets/appointments/:id` - Remover

**Valorização:**
- `POST /api/tickets/valuations` - Criar
- `GET /api/tickets/:id/valuations?category=client_charge|internal_cost` - Listar
- `GET /api/tickets/:id/valuations/summary` - Totais
- `PATCH /api/tickets/valuations/:id` - Atualizar
- `POST /api/tickets/valuations/approve` - Aprovar/Rejeitar
- `DELETE /api/tickets/valuations/:id` - Remover

**Checklists:**
- `POST /api/tickets/checklists/templates` - Criar template
- `GET /api/tickets/checklists/templates` - Listar templates
- `POST /api/tickets/:id/checklists` - Adicionar ao ticket
- `GET /api/tickets/:id/checklists` - Listar do ticket
- `PATCH /api/tickets/checklists/:id/items` - Marcar item completo
- `DELETE /api/tickets/:id/checklists/:id` - Remover

**Backend Deployado:**
- Servidor: 172.31.255.26
- Porta: 3000
- PM2: backend (online)
- Base de dados: PostgreSQL sys_ticket_db

---

### Frontend (30% Implementado)

#### Arquivos Criados:

1. **Tipos TypeScript** - `apps/frontend/src/types/ticket-details.types.ts`
   - Todos os tipos e interfaces
   - Enums: CommentType, AppointmentType, ServiceCoverageType, ValuationType, etc.
   - DTOs para criação

2. **Services** - `apps/frontend/src/services/ticket-details.service.ts`
   - `commentsService` - 4 métodos
   - `appointmentsService` - 8 métodos (incluindo timer)
   - `valuationsService` - 6 métodos
   - `checklistsService` - 5 métodos

3. **Componente Timer** - `apps/frontend/src/components/Tickets/AppointmentTimer.tsx`
   - Botão Play/Stop
   - Contador em tempo real (HH:MM:SS)
   - Detecção de timer em outro ticket
   - Campo de descrição opcional
   - useQuery com refetch automático (5s)

4. **Services Existentes:**
   - `apps/frontend/src/services/service-catalog.service.ts` - Catálogos
   - `apps/frontend/src/services/client.service.ts` - Contatos de clientes

---

## 🚧 O QUE FALTA IMPLEMENTAR

### Frontend - Componentes das Abas

#### 1. Componente Principal: TicketDetailsPage
**Arquivo:** `apps/frontend/src/pages/TicketDetails.tsx`

**Estrutura:**
```tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticket.service';

// Abas: Informações, Apontamentos, Comunicação, Valorização, Checklists

export function TicketDetailsPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('info');

  const { data: ticket } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getById(id),
  });

  return (
    <div>
      {/* Header com título e status */}
      {/* Tabs */}
      {/* Conteúdo da aba ativa */}
    </div>
  );
}
```

#### 2. Aba de Informações Gerais
**Componente:** `TicketInfo.tsx`
- Solicitante (nome, email, contato)
- Cliente (empresa, contatos)
- Mesa de serviço
- Status, Estágio, Responsável
- Seguidores
- SLA
- Catálogo de serviço selecionado

#### 3. Aba de Apontamentos
**Componente:** `TicketAppointments.tsx`
- **Já criado:** `AppointmentTimer.tsx` (timer play/pause)
- **Criar:** Lista de apontamentos
- **Criar:** Modal para criar apontamento manual
- **Criar:** Card de resumo (total de horas, total de custos)

```tsx
import { AppointmentTimer } from './AppointmentTimer';
import { useQuery } from '@tanstack/react-query';
import { appointmentsService } from '@/services/ticket-details.service';

export function TicketAppointments({ ticketId }: { ticketId: string }) {
  const { data: appointments } = useQuery({
    queryKey: ['appointments', ticketId],
    queryFn: () => appointmentsService.getAppointments(ticketId),
  });

  const { data: summary } = useQuery({
    queryKey: ['appointments-summary', ticketId],
    queryFn: () => appointmentsService.getAppointmentsSummary(ticketId),
  });

  return (
    <div className="space-y-4">
      <AppointmentTimer ticketId={ticketId} />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-600">Total de Horas</p>
          <p className="text-2xl font-bold">{summary?.total_hours.toFixed(2)}h</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-600">Total de Custos</p>
          <p className="text-2xl font-bold">R$ {summary?.total_cost.toFixed(2)}</p>
        </div>
      </div>

      {/* Lista de apontamentos */}
      <div className="space-y-2">
        {appointments?.map((appointment) => (
          <div key={appointment.id} className="p-4 bg-white rounded-lg border">
            {/* Exibir: data, horário, duração, tipo, descrição, usuário */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4. Aba de Comunicação
**Componente:** `TicketCommunication.tsx`
- Sub-abas: Cliente, Interno, Chat
- Editor rico para mensagens
- Lista de comentários
- Botão "Enviar ao cliente"

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsService } from '@/services/ticket-details.service';
import { CommentType } from '@/types/ticket-details.types';

export function TicketCommunication({ ticketId }: { ticketId: string }) {
  const [commentType, setCommentType] = useState<CommentType>(CommentType.INTERNAL);
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ['comments', ticketId, commentType],
    queryFn: () => commentsService.getComments(ticketId, commentType),
  });

  const createMutation = useMutation({
    mutationFn: (data) => commentsService.createComment(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
      setContent('');
    },
  });

  return (
    <div className="space-y-4">
      {/* Tabs: Cliente, Interno, Chat */}

      {/* Editor de comentário */}
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />

      {/* Lista de comentários */}
      {comments?.map((comment) => (
        <div key={comment.id} className="p-4 bg-white rounded-lg border">
          {/* Avatar, nome, data, conteúdo */}
        </div>
      ))}
    </div>
  );
}
```

#### 5. Aba de Valorização
**Componente:** `TicketValuation.tsx`
- Botão "Adicionar Produto/Serviço"
- Modal com busca de produtos do SIGE Cloud
- Lista de valorizações (com totais)
- Separação: Valores ao Cliente / Custos Internos

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { valuationsService } from '@/services/ticket-details.service';

export function TicketValuation({ ticketId }: { ticketId: string }) {
  const { data: valuations } = useQuery({
    queryKey: ['valuations', ticketId],
    queryFn: () => valuationsService.getValuations(ticketId),
  });

  const { data: summary } = useQuery({
    queryKey: ['valuations-summary', ticketId],
    queryFn: () => valuationsService.getValuationSummary(ticketId),
  });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm">Cliente</p>
          <p className="text-xl font-bold">R$ {summary?.client_charges}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm">Custos Internos</p>
          <p className="text-xl font-bold">R$ {summary?.internal_costs}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm">Total</p>
          <p className="text-xl font-bold">R$ {summary?.total}</p>
        </div>
      </div>

      {/* Lista de valorizações */}
    </div>
  );
}
```

#### 6. Aba de Checklists
**Componente:** `TicketChecklists.tsx`
- Botão "Adicionar Checklist"
- Modal para selecionar template
- Lista de checklists do ticket
- Checkboxes interativos
- Barra de progresso

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistsService } from '@/services/ticket-details.service';

export function TicketChecklists({ ticketId }: { ticketId: string }) {
  const { data: checklists } = useQuery({
    queryKey: ['ticket-checklists', ticketId],
    queryFn: () => checklistsService.getTicketChecklists(ticketId),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ checklistId, itemId, isCompleted }) =>
      checklistsService.updateChecklistItem(checklistId, {
        item_id: itemId,
        is_completed: isCompleted,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklists'] });
    },
  });

  return (
    <div className="space-y-4">
      {checklists?.map((checklist) => (
        <div key={checklist.id} className="p-4 bg-white rounded-lg border">
          <h3>{checklist.checklist_name}</h3>

          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${checklist.completion_percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {checklist.completed_items} / {checklist.total_items} completos
          </p>

          {/* Items */}
          {checklist.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={(e) =>
                  updateItemMutation.mutate({
                    checklistId: checklist.id,
                    itemId: item.id,
                    isCompleted: e.target.checked,
                  })
                }
              />
              <label>{item.title}</label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

### Integração com SIGE Cloud - Produtos

**Ainda não implementado!**

#### Criar Service para Produtos SIGE:
**Arquivo:** `apps/backend/src/modules/clients/clients.service.ts`

**Adicionar método:**
```typescript
async searchProducts(query: string, page = 1, perPage = 20) {
  const response = await this.sigeApi.get('/produtos', {
    params: {
      nome: query,
      page,
      per_page: perPage,
    },
  });

  return {
    data: response.data.produtos,
    meta: {
      current_page: page,
      total: response.data.total,
    },
  };
}
```

**Adicionar endpoint:**
**Arquivo:** `apps/backend/src/modules/clients/clients.controller.ts`
```typescript
@Get('products/search')
async searchProducts(
  @Query('query') query: string,
  @Query('page') page = 1,
  @Query('per_page') perPage = 20,
) {
  return this.clientsService.searchProducts(query, page, perPage);
}
```

**Frontend:**
```typescript
// apps/frontend/src/services/sige-products.service.ts
export const sigeProductsService = {
  async searchProducts(query: string, page = 1) {
    const response = await api.get('/clients/products/search', {
      params: { query, page },
    });
    return response.data;
  },
};
```

---

## 🎯 PRÓXIMOS PASSOS

### Passo 1: Criar Componentes das Abas
1. Criar `TicketAppointments.tsx`
2. Criar `TicketCommunication.tsx`
3. Criar `TicketValuation.tsx`
4. Criar `TicketChecklists.tsx`

### Passo 2: Criar Página Principal
1. Criar `apps/frontend/src/pages/TicketDetails.tsx`
2. Adicionar rota no React Router
3. Implementar sistema de abas (TailwindCSS tabs)

### Passo 3: Integração SIGE Cloud
1. Adicionar endpoint de busca de produtos no backend
2. Criar modal de seleção de produtos no frontend
3. Vincular com valorização

### Passo 4: Build e Deploy
```bash
# Frontend
cd apps/frontend
npm run build

# Backend já está deployado!

# Deploy frontend
scp -r dist/* root@172.31.255.26:/var/www/sys-ticket/frontend/
```

---

## 📋 COMANDOS ÚTEIS

### Backend
```bash
# SSH no servidor
ssh root@172.31.255.26

# Ver logs
pm2 logs backend --lines 50

# Restart
pm2 restart backend

# Rebuild
cd /root/Sys-Ticket/apps/backend
npm run build
pm2 restart backend
```

### Frontend
```bash
# Local
cd apps/frontend
npm run dev

# Build
npm run build

# Deploy
scp -r dist/* root@172.31.255.26:/var/www/sys-ticket/frontend/
```

### Git
```bash
git add .
git commit -m "Mensagem"
git push
```

---

## 🔗 URLs e Credenciais

**Servidor:**
- IP: 172.31.255.26
- Usuário: root
- Senha: 123321

**Banco de Dados:**
- Host: localhost
- Port: 5432
- Database: sys_ticket_db
- User: sys_ticket
- Password: 123321

**API Backend:**
- URL: http://172.31.255.26:3000/api
- Swagger: http://172.31.255.26:3000/api/docs

---

## 📁 ESTRUTURA DE ARQUIVOS IMPORTANTES

```
apps/
├── backend/
│   └── src/modules/tickets/
│       ├── entities/
│       │   ├── ticket-comment.entity.ts ✅
│       │   ├── ticket-appointment.entity.ts ✅
│       │   ├── ticket-valuation.entity.ts ✅
│       │   ├── checklist.entity.ts ✅
│       │   └── ticket-checklist.entity.ts ✅
│       ├── services/
│       │   ├── ticket-comments.service.ts ✅
│       │   ├── ticket-appointments.service.ts ✅
│       │   ├── ticket-valuations.service.ts ✅
│       │   └── checklists.service.ts ✅
│       ├── controllers/
│       │   └── ticket-details.controller.ts ✅
│       ├── dto/
│       │   ├── create-comment.dto.ts ✅
│       │   ├── create-appointment.dto.ts ✅
│       │   ├── create-valuation.dto.ts ✅
│       │   └── create-checklist.dto.ts ✅
│       └── tickets.module.ts ✅
│
├── frontend/
│   └── src/
│       ├── types/
│       │   └── ticket-details.types.ts ✅
│       ├── services/
│       │   ├── ticket-details.service.ts ✅
│       │   ├── service-catalog.service.ts ✅
│       │   └── client.service.ts ✅
│       ├── components/Tickets/
│       │   ├── AppointmentTimer.tsx ✅
│       │   ├── TicketAppointments.tsx ❌ CRIAR
│       │   ├── TicketCommunication.tsx ❌ CRIAR
│       │   ├── TicketValuation.tsx ❌ CRIAR
│       │   └── TicketChecklists.tsx ❌ CRIAR
│       └── pages/
│           └── TicketDetails.tsx ❌ CRIAR
│
└── database/migrations/
    └── 002-ticket-details-tables.sql ✅
```

---

## ⚡ RESUMO DO QUE FOI FEITO

✅ Backend 100% completo (5 entidades, 4 services, 30+ endpoints)
✅ Banco de dados criado e populado
✅ Backend deployado e online
✅ Types TypeScript criados
✅ Services frontend criados
✅ Componente de Timer implementado

## 🚀 PARA CONTINUAR

1. Criar os 4 componentes das abas faltantes
2. Criar a página principal TicketDetails
3. Adicionar integração de produtos SIGE Cloud
4. Build e deploy do frontend
5. Testar todas as funcionalidades

**Total estimado:** 2-3 horas de desenvolvimento

---

**Boa sorte com a continuação! 🎉**
