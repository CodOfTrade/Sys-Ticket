# 🗄️ Database Schema - Sys-Ticket

Documentação completa do schema do banco de dados PostgreSQL.

## 📊 Diagrama ER (Resumido)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    Users     │       │ServiceDesks  │       │   Tickets    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ name         │       │ name         │       │ ticket_number│
│ email        │       │ description  │       │ client_id    │
│ password     │       │ sla_config   │◄──────┤ service_desk │
│ role         │       └──────────────┘       │ assigned_to  │
│ status       │                              │ status       │
└──────┬───────┘                              │ priority     │
       │                                      │ contract_id  │
       │        ┌──────────────┐              └──────┬───────┘
       │        │ Timesheets   │                     │
       │        ├──────────────┤                     │
       └────────┤ id (PK)      │                     │
                │ ticket_id    │◄────────────────────┘
                │ user_id      │
                │ start_time   │
                │ end_time     │
                │ duration     │
                │ type         │
                │ billable     │
                └──────────────┘

       ┌──────────────┐              ┌──────────────┐
       │  Signatures  │              │   Photos     │
       ├──────────────┤              ├──────────────┤
       │ id (PK)      │              │ id (PK)      │
       │ ticket_id    │◄────────┐    │ ticket_id    │
       │ image_url    │         │    │ image_url    │
       │ signatory    │         │    │ category     │
       │ gps_lat      │         │    │ gps_lat      │
       │ gps_lng      │         └────┤ gps_lng      │
       └──────────────┘              └──────────────┘
```

## 📋 Tabelas Principais

### `users` - Usuários do Sistema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'agent', 'client') DEFAULT 'agent',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  avatar_url VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(100),
  client_id VARCHAR(100),  -- ID do SIGE Cloud (se for cliente)
  permissions TEXT[],
  service_desk_ids TEXT[],
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  refresh_token TEXT,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(100),
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client_id ON users(client_id);
```

### `service_desks` - Mesas de Serviço

```sql
CREATE TABLE service_desks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sla_config JSONB,  -- Configurações de SLA
  workflow_config JSONB,  -- Workflow de status
  custom_fields JSONB,  -- Campos personalizados
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `tickets` - Tickets de Atendimento

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,

  -- Cliente (SIGE Cloud)
  client_id VARCHAR(100) NOT NULL,
  client_name VARCHAR(255) NOT NULL,

  -- Solicitante
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255),
  requester_phone VARCHAR(50),

  -- Detalhes
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM(
    'new', 'in_progress', 'waiting_client', 'waiting_third_party',
    'paused', 'waiting_approval', 'resolved', 'ready_to_invoice',
    'closed', 'cancelled'
  ) DEFAULT 'new',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  type ENUM('internal', 'remote', 'external') DEFAULT 'remote',
  category VARCHAR(100),
  tags TEXT[],

  -- Relacionamentos
  service_desk_id UUID NOT NULL REFERENCES service_desks(id),
  assigned_to_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  parent_ticket_id UUID REFERENCES tickets(id),

  -- Contrato (SIGE Cloud)
  contract_id VARCHAR(100),
  contract_coverage ENUM('covered', 'partial', 'not_covered', 'no_contract') DEFAULT 'no_contract',

  -- SLA
  sla_first_response_due TIMESTAMP,
  sla_resolution_due TIMESTAMP,
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  sla_violated BOOLEAN DEFAULT false,

  -- Faturamento
  can_invoice BOOLEAN DEFAULT false,
  invoiced BOOLEAN DEFAULT false,
  invoice_id VARCHAR(100),  -- OS ID do SIGE Cloud
  total_amount DECIMAL(10,2) DEFAULT 0,

  -- Localização
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_address VARCHAR(500),

  -- Metadados
  custom_fields JSONB,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_tickets_client ON tickets(client_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX idx_tickets_service_desk ON tickets(service_desk_id);
CREATE INDEX idx_tickets_contract ON tickets(contract_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);

-- Full-text search
CREATE INDEX idx_tickets_search ON tickets USING GIN(
  to_tsvector('portuguese', title || ' ' || description)
);
```

### `timesheets` - Apontamentos de Tempo

```sql
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Tempo
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER,  -- em minutos

  -- Tipo
  type ENUM('internal', 'remote', 'external') DEFAULT 'remote',

  -- Valorização
  billable BOOLEAN DEFAULT true,
  billing_type ENUM('contract', 'extra', 'warranty', 'manual') DEFAULT 'extra',
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,

  -- Descrição
  description TEXT,

  -- GPS (atendimentos externos)
  start_latitude DECIMAL(10,8),
  start_longitude DECIMAL(11,8),
  end_latitude DECIMAL(10,8),
  end_longitude DECIMAL(11,8),

  -- Sincronização offline
  sync_status ENUM('pending', 'synced', 'error') DEFAULT 'synced',
  synced_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timesheets_ticket ON timesheets(ticket_id);
CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_timesheets_dates ON timesheets(start_time, end_time);
```

### `signatures` - Assinaturas Digitais

```sql
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,

  -- Imagem
  image_url TEXT NOT NULL,
  image_base64 TEXT,  -- Para offline sync

  -- Signatário
  signatory_name VARCHAR(255) NOT NULL,
  signatory_document VARCHAR(50),
  signatory_type ENUM('client', 'technician') DEFAULT 'client',

  -- Metadados
  signed_at TIMESTAMP DEFAULT NOW(),
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  device_info JSONB,

  -- Sincronização
  sync_status ENUM('pending', 'synced', 'error') DEFAULT 'synced',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signatures_ticket ON signatures(ticket_id);
```

### `photos` - Fotos/Evidências

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,

  -- Imagem
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Categoria
  category ENUM('before', 'during', 'after', 'problem', 'solution') DEFAULT 'during',
  description TEXT,

  -- Metadados EXIF
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  taken_at TIMESTAMP,

  -- Sincronização
  sync_status ENUM('pending', 'synced', 'error') DEFAULT 'synced',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_photos_ticket ON photos(ticket_id);
```

### `webhooks` - Webhooks para Integrações

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  events TEXT[] NOT NULL,  -- ['ticket.created', 'ticket.closed', ...]
  is_active BOOLEAN DEFAULT true,
  headers JSONB,  -- Headers customizados
  retry_count INTEGER DEFAULT 3,
  timeout INTEGER DEFAULT 30000,  -- em ms
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `webhook_logs` - Logs de Webhooks

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event);
```

## 🔄 Sincronização Offline (Mobile)

### `sync_queue` - Fila de Sincronização (SQLite Local)

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,  -- 'ticket', 'timesheet', 'signature', 'photo'
  action TEXT NOT NULL,  -- 'create', 'update', 'delete'
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON stringified
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📈 Views Úteis

### `vw_tickets_with_stats` - Tickets com Estatísticas

```sql
CREATE VIEW vw_tickets_with_stats AS
SELECT
  t.*,
  u.name as assigned_to_name,
  sd.name as service_desk_name,
  COUNT(DISTINCT ts.id) as timesheet_count,
  SUM(ts.duration) as total_duration,
  SUM(ts.total_amount) as total_timesheet_amount,
  COUNT(DISTINCT s.id) as signature_count,
  COUNT(DISTINCT p.id) as photo_count
FROM tickets t
LEFT JOIN users u ON t.assigned_to_id = u.id
LEFT JOIN service_desks sd ON t.service_desk_id = sd.id
LEFT JOIN timesheets ts ON t.id = ts.ticket_id
LEFT JOIN signatures s ON t.id = s.ticket_id
LEFT JOIN photos p ON t.id = p.ticket_id
GROUP BY t.id, u.name, sd.name;
```

## 🔐 Segurança

### Row-Level Security (Exemplo)

```sql
-- Usuários do tipo 'client' só veem tickets do seu cliente
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_tickets_policy ON tickets
  FOR SELECT
  TO client_role
  USING (client_id = current_setting('app.current_user_client_id'));
```

## 🚀 Performance

### Particionamento (Para grandes volumes)

```sql
-- Particionar tickets por ano
CREATE TABLE tickets_2025 PARTITION OF tickets
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE tickets_2026 PARTITION OF tickets
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

**Nota**: Este schema é atualizado automaticamente pelas migrations do TypeORM.
