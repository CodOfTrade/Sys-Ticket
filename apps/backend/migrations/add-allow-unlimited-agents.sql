-- Migration: Adicionar campo allow_unlimited_agents na tabela sige_clients
-- Data: 2026-01-29
-- Descrição: Permite liberar clientes individualmente para registrar agentes sem validação de cota

-- Adicionar coluna se não existir
ALTER TABLE sige_clients
ADD COLUMN IF NOT EXISTS allow_unlimited_agents BOOLEAN DEFAULT FALSE;

-- Comentário da coluna
COMMENT ON COLUMN sige_clients.allow_unlimited_agents IS 'Permite que o cliente registre agentes ilimitados, ignorando a validação de cota do contrato';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sige_clients'
AND column_name = 'allow_unlimited_agents';
