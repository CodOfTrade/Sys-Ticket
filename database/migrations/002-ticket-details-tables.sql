-- Script de criação das tabelas para funcionalidades detalhadas do ticket
-- Baseado no sistema TFlux
-- Data: 2026-01-05

-- =====================================================
-- Tabela: ticket_comments (Comunicação)
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'internal' CHECK (type IN ('client', 'internal', 'chat')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  sent_to_client BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  attachment_ids TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_type ON ticket_comments(type);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- =====================================================
-- Tabela: ticket_appointments (Apontamentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  user_id UUID NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  type VARCHAR(20) DEFAULT 'service' CHECK (type IN ('service', 'travel', 'meeting', 'analysis')),
  coverage_type VARCHAR(20) DEFAULT 'contract' CHECK (coverage_type IN ('contract', 'warranty', 'billable', 'internal')),
  description TEXT,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  travel_distance_km DECIMAL(10,2),
  travel_cost DECIMAL(10,2),
  is_timer_based BOOLEAN DEFAULT FALSE,
  timer_started_at TIMESTAMP,
  timer_stopped_at TIMESTAMP,
  contract_id VARCHAR(100),
  service_order_id VARCHAR(100),
  requires_approval BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by_id UUID,
  approved_at TIMESTAMP,
  attachment_ids TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_appointments_ticket_id ON ticket_appointments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_appointments_user_id ON ticket_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_appointments_date ON ticket_appointments(appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_appointments_coverage ON ticket_appointments(coverage_type);

-- =====================================================
-- Tabela: ticket_valuations (Valorização - produtos e extras)
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  type VARCHAR(20) DEFAULT 'product' CHECK (type IN ('product', 'service', 'extra', 'discount')),
  category VARCHAR(20) DEFAULT 'client_charge' CHECK (category IN ('client_charge', 'internal_cost')),
  sige_product_id VARCHAR(100),
  sige_product_name VARCHAR(255),
  sige_product_code VARCHAR(100),
  description VARCHAR(500) NOT NULL,
  valuation_date DATE NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'UN',
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  attachment_ids TEXT,
  notes TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by_id UUID,
  approved_at TIMESTAMP,
  service_order_id VARCHAR(100),
  synced_to_sige BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_valuations_ticket_id ON ticket_valuations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_valuations_category ON ticket_valuations(category);
CREATE INDEX IF NOT EXISTS idx_ticket_valuations_date ON ticket_valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_valuations_sige_product ON ticket_valuations(sige_product_id);

-- =====================================================
-- Tabela: checklists (Templates de checklist)
-- =====================================================
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  service_desk_id UUID NOT NULL,
  items JSONB NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL,
  FOREIGN KEY (service_desk_id) REFERENCES service_desks(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_checklists_service_desk ON checklists(service_desk_id);
CREATE INDEX IF NOT EXISTS idx_checklists_active ON checklists(is_active);
CREATE INDEX IF NOT EXISTS idx_checklists_category ON checklists(category);

-- =====================================================
-- Tabela: ticket_checklists (Instâncias de checklist nos tickets)
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  checklist_id UUID NOT NULL,
  checklist_name VARCHAR(255) NOT NULL,
  items JSONB NOT NULL,
  completed_items INT DEFAULT 0,
  total_items INT DEFAULT 0,
  completion_percent DECIMAL(5,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_checklists_ticket_id ON ticket_checklists(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_checklists_checklist_id ON ticket_checklists(checklist_id);
CREATE INDEX IF NOT EXISTS idx_ticket_checklists_completed ON ticket_checklists(is_completed);

-- =====================================================
-- Comentários nas tabelas
-- =====================================================
COMMENT ON TABLE ticket_comments IS 'Comentários e comunicações do ticket (cliente, interno, chat)';
COMMENT ON TABLE ticket_appointments IS 'Apontamentos de tempo e trabalho realizados no ticket';
COMMENT ON TABLE ticket_valuations IS 'Valorização do ticket com produtos e serviços adicionais';
COMMENT ON TABLE checklists IS 'Templates reutilizáveis de checklists';
COMMENT ON TABLE ticket_checklists IS 'Instâncias de checklists aplicados aos tickets';

-- =====================================================
-- Dados de exemplo para checklists
-- =====================================================
INSERT INTO checklists (name, description, service_desk_id, items, category, created_by_id)
VALUES
(
  'Checklist de Manutenção Preventiva',
  'Verificações padrão para manutenção preventiva de computadores',
  '3d316765-6615-4082-9bb7-d7d6a266db09',
  '[
    {"id": "1", "title": "Verificar atualizações do sistema operacional", "order": 1, "required": true},
    {"id": "2", "title": "Executar antivírus completo", "order": 2, "required": true},
    {"id": "3", "title": "Limpar arquivos temporários", "order": 3, "required": false},
    {"id": "4", "title": "Verificar espaço em disco", "order": 4, "required": true},
    {"id": "5", "title": "Testar backup", "order": 5, "required": true},
    {"id": "6", "title": "Verificar licenças de software", "order": 6, "required": false}
  ]'::jsonb,
  'Manutenção',
  (SELECT id FROM users LIMIT 1)
),
(
  'Checklist de Instalação de Estação',
  'Passos para instalação completa de uma nova estação de trabalho',
  '3d316765-6615-4082-9bb7-d7d6a266db09',
  '[
    {"id": "1", "title": "Instalar sistema operacional", "order": 1, "required": true},
    {"id": "2", "title": "Configurar rede e domínio", "order": 2, "required": true},
    {"id": "3", "title": "Instalar pacote Office", "order": 3, "required": true},
    {"id": "4", "title": "Instalar antivírus corporativo", "order": 4, "required": true},
    {"id": "5", "title": "Configurar impressoras", "order": 5, "required": false},
    {"id": "6", "title": "Instalar softwares específicos do usuário", "order": 6, "required": false},
    {"id": "7", "title": "Configurar backup automático", "order": 7, "required": true},
    {"id": "8", "title": "Realizar treinamento com usuário", "order": 8, "required": false}
  ]'::jsonb,
  'Instalação',
  (SELECT id FROM users LIMIT 1)
)
ON CONFLICT DO NOTHING;
