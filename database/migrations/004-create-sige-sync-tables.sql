-- Migration: Create SIGE Cloud sync tables
-- Date: 2026-01-05
-- Description: Create local tables to store synchronized data from SIGE Cloud (products, clients, contracts)

-- Table: sige_products
-- Stores products synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sige_id varchar(100) NOT NULL UNIQUE,
  nome varchar(255) NOT NULL,
  descricao text,
  codigo varchar(100),
  preco_venda decimal(10,2),
  preco_custo decimal(10,2),
  unidade varchar(50),
  tipo varchar(50),
  ativo boolean DEFAULT true,
  last_synced_at timestamp DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Table: sige_clients
-- Stores clients synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sige_id varchar(100) NOT NULL UNIQUE,
  nome varchar(255) NOT NULL,
  razao_social varchar(255),
  nome_fantasia varchar(255),
  cpf_cnpj varchar(20),
  tipo_pessoa varchar(10),
  email varchar(255),
  telefone varchar(20),
  celular varchar(20),
  endereco text,
  cidade varchar(100),
  estado varchar(2),
  cep varchar(10),
  ativo boolean DEFAULT true,
  last_synced_at timestamp DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Table: sige_contracts
-- Stores contracts synchronized from SIGE Cloud
CREATE TABLE IF NOT EXISTS sige_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sige_id varchar(100) NOT NULL UNIQUE,
  sige_client_id uuid REFERENCES sige_clients(id) ON DELETE CASCADE,
  numero_contrato varchar(100),
  descricao text,
  valor_mensal decimal(10,2),
  data_inicio date,
  data_fim date,
  status varchar(50),
  tipo varchar(50),
  observacoes text,
  ativo boolean DEFAULT true,
  last_synced_at timestamp DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
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

-- Add comments
COMMENT ON TABLE sige_products IS 'Produtos sincronizados do SIGE Cloud';
COMMENT ON COLUMN sige_products.sige_id IS 'ID original do produto no SIGE Cloud';
COMMENT ON COLUMN sige_products.last_synced_at IS 'Data/hora da última sincronização';

COMMENT ON TABLE sige_clients IS 'Clientes sincronizados do SIGE Cloud';
COMMENT ON COLUMN sige_clients.sige_id IS 'ID original do cliente no SIGE Cloud';
COMMENT ON COLUMN sige_clients.last_synced_at IS 'Data/hora da última sincronização';

COMMENT ON TABLE sige_contracts IS 'Contratos sincronizados do SIGE Cloud';
COMMENT ON COLUMN sige_contracts.sige_id IS 'ID original do contrato no SIGE Cloud';
COMMENT ON COLUMN sige_contracts.last_synced_at IS 'Data/hora da última sincronização';
