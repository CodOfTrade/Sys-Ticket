-- Criar tabela de catálogo de serviços
CREATE TABLE IF NOT EXISTS service_catalogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  service_desk_id UUID NOT NULL,
  sla_config JSONB,
  requires_approval BOOLEAN DEFAULT FALSE,
  is_billable BOOLEAN DEFAULT TRUE,
  default_price DECIMAL(10,2),
  estimated_time INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de categorias de serviço
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  service_catalog_id UUID NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalogs(id)
);

-- Criar tabela de contatos de clientes
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(100),
  position VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  can_request_tickets BOOLEAN DEFAULT TRUE,
  receive_notifications BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de seguidores de tickets
CREATE TABLE IF NOT EXISTS ticket_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  user_id UUID,
  email VARCHAR(255),
  name VARCHAR(255),
  notification_preferences JSONB DEFAULT '{}',
  added_by_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Criar tabela de anexos de tickets
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  filename VARCHAR(500) NOT NULL,
  stored_filename VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  url TEXT,
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  md5_hash VARCHAR(32),
  attachment_type VARCHAR(20) DEFAULT 'other',
  is_inline BOOLEAN DEFAULT FALSE,
  comment_id UUID,
  uploaded_by_id UUID NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Adicionar novas colunas à tabela tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS service_catalog_id UUID;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS service_category_id UUID;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_service_catalogs_service_desk ON service_catalogs(service_desk_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_catalog ON service_categories(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_ticket_followers_ticket ON ticket_followers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_catalog ON tickets(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(service_category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_contact ON tickets(contact_id);

-- ========================================
-- TABELAS DE SINCRONIZAÇÃO SIGE CLOUD
-- ========================================

-- Table: sige_products
-- Stores products synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sige_id VARCHAR(100) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(100),
  preco_venda DECIMAL(10,2),
  preco_custo DECIMAL(10,2),
  unidade VARCHAR(50),
  tipo VARCHAR(50),
  ativo BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: sige_clients
-- Stores clients synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sige_id VARCHAR(100) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cpf_cnpj VARCHAR(20),
  tipo_pessoa VARCHAR(10),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  ativo BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: sige_contracts
-- Stores contracts synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sige_id VARCHAR(100) NOT NULL UNIQUE,
  sige_client_id UUID REFERENCES sige_clients(id) ON DELETE CASCADE,
  numero_contrato VARCHAR(100),
  descricao TEXT,
  valor_mensal DECIMAL(10,2),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(50),
  tipo VARCHAR(50),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for SIGE tables
CREATE INDEX IF NOT EXISTS idx_sige_products_sige_id ON sige_products(sige_id);
CREATE INDEX IF NOT EXISTS idx_sige_products_nome ON sige_products(nome);
CREATE INDEX IF NOT EXISTS idx_sige_products_codigo ON sige_products(codigo);
CREATE INDEX IF NOT EXISTS idx_sige_products_ativo ON sige_products(ativo);
CREATE INDEX IF NOT EXISTS idx_sige_products_last_synced ON sige_products(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_sige_clients_sige_id ON sige_clients(sige_id);
CREATE INDEX IF NOT EXISTS idx_sige_clients_nome ON sige_clients(nome);
CREATE INDEX IF NOT EXISTS idx_sige_clients_cpf_cnpj ON sige_clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_sige_clients_ativo ON sige_clients(ativo);
CREATE INDEX IF NOT EXISTS idx_sige_clients_last_synced ON sige_clients(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_sige_contracts_sige_id ON sige_contracts(sige_id);
CREATE INDEX IF NOT EXISTS idx_sige_contracts_client_id ON sige_contracts(sige_client_id);
CREATE INDEX IF NOT EXISTS idx_sige_contracts_status ON sige_contracts(status);
CREATE INDEX IF NOT EXISTS idx_sige_contracts_ativo ON sige_contracts(ativo);
CREATE INDEX IF NOT EXISTS idx_sige_contracts_last_synced ON sige_contracts(last_synced_at);
