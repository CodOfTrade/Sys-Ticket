# Checkpoint - Implementação de Precificação Matricial

**Data:** 2026-01-30
**Status:** Backend completo ✅ | Frontend 90% completo | **BLOQUEIO:** service_desk_id vazio

---

## 📊 Resumo Geral

Implementação de sistema de precificação matricial (Classificação × Modalidade) onde:
- **Classificações** são cadastráveis (CRUD completo)
- **Modalidades** são fixas (Interno, Remoto, Presencial externo)
- Cada classificação tem 3 configurações de modalidade com parâmetros próprios

---

## ✅ O que foi IMPLEMENTADO e FUNCIONA

### Backend (100% Completo)

#### 1. Database Schema
- ✅ Enum `ServiceModality` criado em `apps/backend/src/modules/service-desks/enums/service-modality.enum.ts`
- ✅ Entity `PricingConfig` modificada (nome, description, relação com modality_configs)
- ✅ Entity `PricingModalityConfig` criada (configurações por modalidade)
- ✅ Entity `TicketAppointment` modificada (pricing_config_id, service_modality)
- ✅ Migration `1738288648654-CreatePricingMatrixStructure.ts` executada com sucesso
- ✅ Seed `pricing-configs.seed.ts` criado com 5 classificações iniciais

**Estrutura no Banco:**
```sql
-- pricing_configs (classificações cadastráveis)
id, service_desk_id, name, description, active

-- pricing_modality_configs (3 por classificação)
id, pricing_config_id, modality (enum), hourly_rate, minimum_charge,
minimum_charge_threshold_minutes, charge_excess_per_minute

-- ticket_appointments (vincula classificação + modalidade)
id, pricing_config_id, service_modality, ...
```

#### 2. DTOs e Validações
- ✅ `CreatePricingModalityConfigDto` e `UpdatePricingModalityConfigDto`
- ✅ `CreatePricingConfigDto` e `UpdatePricingConfigDto` (com array de 3 modalidades)
- ✅ DTOs de Appointments atualizados (pricing_config_id, service_modality)
- ✅ Validação: service_desk_id obrigatório (UUID)

#### 3. Services e Controllers
- ✅ `PricingConfigService` com CRUD completo
- ✅ Método `calculatePrice()` atualizado para usar modalityConfig específico
- ✅ `TicketAppointmentsService` atualizado
  - `calculateAndApplyPrice()` busca modalityConfig correto
  - `calculatePriceEstimate()` usa pricing_config_id + service_modality
- ✅ `PricingConfigController` com endpoints:
  - `GET /v1/pricing-configs` (listar)
  - `GET /v1/pricing-configs/:id` (buscar um)
  - `POST /v1/pricing-configs` (criar)
  - `PATCH /v1/pricing-configs/:id` (atualizar)
  - `DELETE /v1/pricing-configs/:id` (deletar)

#### 4. Deploy Backend
- ✅ Migration executada no servidor: `npm run migration:run`
- ✅ Seed executado no servidor: `cd apps/backend && npm run seed`
- ✅ Backend reiniciado: `pm2 restart sys-ticket-api`
- ✅ 5 classificações criadas no banco:
  1. Atendimento avulso N1
  2. Atendimento avulso N2
  3. Demanda interna
  4. Terceirizado N1
  5. Terceirizado N2

### Frontend (90% Completo)

#### 1. Types e Interfaces
- ✅ Enum `ServiceModality` (internal, remote, external)
- ✅ Interface `PricingModalityConfig`
- ✅ Interface `PricingConfig` (com array modality_configs)
- ✅ Helper `getModalityConfig()`
- ✅ DTOs atualizados (CreatePricingConfigDto, UpdatePricingConfigDto)
- ✅ `TicketAppointment` interface atualizada (pricing_config_id, service_modality)

#### 2. Services
- ✅ `pricing-config.service.ts` criado (CRUD completo)
- ✅ `appointmentsService` atualizado (calculatePrice, create, update, stopTimer)

#### 3. UI - Configurações de Precificação
- ✅ `PricingSettings.tsx` reescrito com accordion cards
  - Lista todas as classificações
  - Accordion expansível (mostra/esconde modalidades)
  - Botão "Nova Classificação"
  - Botão deletar classificação
- ✅ `ModalityConfigSection.tsx` criado
  - Exibe campos de uma modalidade (Interno/Remoto/Externo)
  - Edição inline (botão Editar/Salvar/Cancelar)
  - Preview de cálculos com exemplos
  - **FIX:** Adicionado `Number()` para converter decimal do TypeORM
- ✅ `CreatePricingConfigModal.tsx` criado
  - Formulário com nome + descrição
  - 3 seções para configurar cada modalidade
  - **FIX:** Adicionado `|| 0` e `|| 60` para prevenir NaN em campos vazios
  - **PENDENTE FIX:** Validação de service_desk_id

#### 4. UI - Appointments (Timer e Manual)
- ✅ `AppointmentTimer.tsx` atualizado
  - Modal "Parar Timer" com 2 novos dropdowns:
    - Dropdown de Classificação (dinâmico, busca pricing_configs)
    - Dropdown de Modalidade (fixo: Interno/Remoto/Externo)
  - Preview de preço em tempo real
  - Envia pricing_config_id + service_modality ao parar timer
- ✅ `TicketAppointments.tsx` atualizado
  - Formulário "Novo Apontamento" com 2 dropdowns
  - Cálculo automático de preço (live preview)
  - Suporte a Contrato vs Avulso
  - Suporte a Garantia e Valor Manual

#### 5. Deploy Frontend
- ✅ Build executado com sucesso: `npm run build`
- ✅ Deploy no servidor: arquivos copiados para `/var/www/sys-ticket/`
- ✅ Interface carregando corretamente

---

## 🚨 PROBLEMA ATUAL (Bloqueador)

### Erro ao Criar Nova Classificação

**Sintoma:**
- Usuário clica em "+ Nova Classificação"
- Preenche o formulário
- Ao salvar: **400 Bad Request**
- Console do navegador: `"The specified value 'NaN' cannot be parsed"` → **RESOLVIDO**
- Backend logs: `"service_desk_id should not be empty"` e `"service_desk_id must be a UUID"` → **AINDA OCORRE**

**Causa Raiz:**
1. Frontend `auth.store.ts` define: `service_desk_id?: string` (singular)
2. Backend `user.entity.ts` define: `service_desk_ids: string[]` (plural, array)
3. Usuário admin não tem `service_desk_id` populado no token JWT
4. `CreatePricingConfigModal.tsx` linha 46: `if (!user?.service_desk_id)` → sempre true
5. Resultado: DTO enviado com `service_desk_id: ''` (string vazia)
6. Backend rejeita com validação de UUID

**Tentativas de Fix:**

1. ✅ **Fix 1:** Adicionado `|| 0` nos campos numéricos → resolveu erro de NaN
   - Commit: `d4d32ca`

2. ❌ **Fix 2:** Tentou adicionar validação no modal → não resolveu porque user.service_desk_id é undefined

3. ❌ **Fix 3:** Tentou atualizar seed para popular `service_desk_id` → **erro: coluna não existe**
   - Seed tentou: `UPDATE users SET service_desk_id = $1 WHERE id = $2`
   - Erro: `column "service_desk_id" of relation "users" does not exist`
   - Confirmado: Backend tem `service_desk_ids` (array), não `service_desk_id` (singular)

---

## 🔧 SOLUÇÃO PENDENTE (Próximos Passos)

### Opção 1: Atualizar Seed para Popular Array (RECOMENDADO)

**Arquivo:** `apps/backend/src/database/seeds/initial-setup.seed.ts`

**Linha 65-67:** Mudar de:
```typescript
await queryRunner.query(
  `UPDATE users SET service_desk_id = $1 WHERE id = $2`,
  [serviceDeskId, adminId],
);
```

Para:
```typescript
// Usar sintaxe de array do PostgreSQL
await queryRunner.query(
  `UPDATE users SET service_desk_ids = $1 WHERE id = $2`,
  [`{${serviceDeskId}}`, adminId], // Array com um elemento
);
```

**Executar:**
```bash
cd /root/Sys-Ticket/apps/backend
npm run seed
```

### Opção 2: Garantir que Backend Login Retorna service_desk_id no Token

**Verificar/Atualizar:** `apps/backend/src/modules/auth/auth.service.ts`

No método que gera o token JWT, garantir que:
```typescript
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
  service_desk_id: user.service_desk_ids?.[0], // Pegar primeiro item do array
};
```

### Opção 3: Frontend Buscar service_desk_id como Fallback

**Arquivo:** `apps/frontend/src/components/Settings/CreatePricingConfigModal.tsx`

**Linha 43-56:** Adicionar lógica de fallback:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  let serviceDeskId = user?.service_desk_id;

  // Se user não tem service_desk_id, buscar da primeira pricing config disponível
  if (!serviceDeskId) {
    try {
      const configs = await pricingConfigService.getAll();
      if (configs.length > 0) {
        serviceDeskId = configs[0].service_desk_id;
      }
    } catch (error) {
      console.error('Erro ao buscar service_desk_id:', error);
    }
  }

  if (!serviceDeskId) {
    toast.error('Não foi possível identificar a mesa de serviço. Contate o administrador.');
    return;
  }

  setIsSubmitting(true);

  try {
    const dto: CreatePricingConfigDto = {
      service_desk_id: serviceDeskId,
      name: formData.name,
      // ... resto do código
    };

    await pricingConfigService.create(dto);
    toast.success('Classificação criada com sucesso!');
    onSuccess();
  } catch (error) {
    toast.error('Erro ao criar classificação');
    console.error(error);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 📋 CHECKLIST de Testes (Após Fix)

### Backend
- [x] Migration executada sem erros
- [x] Seed executou e criou 5 classificações
- [x] Cada classificação tem 3 modalidades no banco
- [ ] Seed atualizou user.service_desk_ids com UUID correto

### Frontend - Settings
- [x] Página de Precificação carrega
- [x] Mostra 5 cards accordion
- [x] Cards expandem/recolhem corretamente
- [x] Edição de valores de modalidade funciona
- [x] Valores são salvos e persistem após reload
- [ ] **Criar nova classificação funciona** ← BLOQUEADO
- [ ] Deletar classificação funciona

### Frontend - Appointments
- [ ] Criar apontamento manual com classificação + modalidade
- [ ] Preview de preço funciona (calcula corretamente)
- [ ] Timer: parar com seleção de classificação + modalidade
- [ ] Preço calculado aparece no appointment criado

### Cálculos de Precificação
- [ ] Tempo < threshold → cobra valor mínimo
- [ ] Tempo > threshold + "Por Minuto" → cobra proporcional
- [ ] Tempo > threshold + "Por Hora" → cobra hora completa (ceil)
- [ ] Garantia → valor zerado
- [ ] Override manual → usa valor digitado

---

## 📁 Arquivos Modificados (Resumo)

### Backend (Todos commitados e deployed)
- `apps/backend/src/modules/service-desks/enums/service-modality.enum.ts` ✅
- `apps/backend/src/modules/service-desks/entities/pricing-config.entity.ts` ✅
- `apps/backend/src/modules/service-desks/entities/pricing-modality-config.entity.ts` ✅
- `apps/backend/src/modules/tickets/entities/ticket-appointment.entity.ts` ✅
- `apps/backend/src/database/migrations/1738288648654-CreatePricingMatrixStructure.ts` ✅
- `apps/backend/src/database/seeds/pricing-configs.seed.ts` ✅
- `apps/backend/src/database/seeds/initial-setup.seed.ts` ⚠️ **PRECISA FIX**
- `apps/backend/src/modules/service-desks/dto/*.dto.ts` ✅
- `apps/backend/src/modules/service-desks/services/pricing-config.service.ts` ✅
- `apps/backend/src/modules/tickets/services/ticket-appointments.service.ts` ✅
- `apps/backend/src/modules/service-desks/controllers/pricing-config.controller.ts` ✅
- `apps/backend/src/modules/service-desks/service-desks.module.ts` ✅

### Frontend (Todos commitados e deployed, mas CreatePricingConfigModal tem bug)
- `apps/frontend/src/types/ticket-details.types.ts` ✅
- `apps/frontend/src/services/pricing-config.service.ts` ✅
- `apps/frontend/src/components/Settings/PricingSettings.tsx` ✅
- `apps/frontend/src/components/Settings/ModalityConfigSection.tsx` ✅
- `apps/frontend/src/components/Settings/CreatePricingConfigModal.tsx` ⚠️ **PRECISA FIX**
- `apps/frontend/src/components/Tickets/TicketAppointments.tsx` ✅
- `apps/frontend/src/components/Tickets/AppointmentTimer.tsx` ✅

---

## 🎯 Comandos para Continuar

### 1. Fix do Seed (Opção Recomendada)
```bash
# No Windows (desenvolvimento)
# Editar: apps/backend/src/database/seeds/initial-setup.seed.ts
# Linha 65-67: trocar service_desk_id por service_desk_ids com array

# Commit
git add .
git commit -m "Fix: Atualiza seed para usar service_desk_ids (array)"
git push

# No Servidor Linux
ssh root@172.31.255.26
cd /root/Sys-Ticket
git pull
cd apps/backend
npm run seed
# Verificar que admin user agora tem service_desk_ids = [uuid]
```

### 2. Verificar se Fix Funcionou
```bash
# No servidor, conectar ao banco
PGPASSWORD='sys_ticket_dev_password' psql -U sys_ticket -d sys_ticket_db -h localhost

# Verificar service_desk_ids do admin
SELECT id, name, email, service_desk_ids FROM users WHERE email = 'admin@systicket.com';
# Deve retornar: {uuid-da-mesa-de-servico}

# Verificar mesa de serviço criada
SELECT id, name FROM service_desks;

# Sair
\q
```

### 3. Testar Criação de Classificação
1. Acessar: https://172.31.255.26
2. Login: admin@systicket.com / admin123
3. Ir em Configurações → Precificação
4. Clicar "+ Nova Classificação"
5. Preencher formulário e salvar
6. Verificar que classificação foi criada sem erro 400

---

## 💡 Observações Importantes

### Mismatch Backend/Frontend
- Backend User: `service_desk_ids: string[]` (array)
- Frontend User: `service_desk_id?: string` (singular)
- **Solução temporária:** Backend login deve mapear `service_desk_ids[0]` para `service_desk_id` no token JWT
- **Solução definitiva:** Alinhar nomenclatura (decidir se será singular ou plural em ambos)

### TypeORM Decimal → String
- Campos `decimal` do TypeORM retornam como `string`, não `number`
- Sempre usar `Number()` ao exibir valores na UI
- Já corrigido em `ModalityConfigSection.tsx`

### PostgreSQL Array Syntax
- Para inserir array: `'{item1,item2}'` (string com chaves)
- Para um item: `'{uuid}'`
- Binding parameter: `$1 = '{uuid}'` ou `$1 = ARRAY['uuid']`

---

## 📞 Informações do Servidor

- **IP:** 172.31.255.26
- **SSH:** `ssh root@172.31.255.26` (senha: 123321)
- **Frontend:** https://172.31.255.26
- **Backend:** https://172.31.255.26/api
- **Swagger:** https://172.31.255.26/api/docs
- **Banco:** PostgreSQL (localhost:5432, user: sys_ticket, db: sys_ticket_db)

---

## 🎉 Quando Tudo Funcionar

Após resolver o issue do `service_desk_id`, a implementação estará 100% completa e será possível:

1. ✅ Criar classificações personalizadas via UI
2. ✅ Editar valores de cada modalidade (Interno/Remoto/Externo)
3. ✅ Criar appointments manuais com classificação + modalidade
4. ✅ Usar timer com seleção de classificação ao parar
5. ✅ Ver preview de preços calculados em tempo real
6. ✅ Deletar classificações não utilizadas

**Próxima fase:** Testes end-to-end conforme plano original (12 testes detalhados)
