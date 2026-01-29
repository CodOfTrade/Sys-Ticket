-- Migration: Criar tabela de códigos de ativação para agentes
-- Data: 2026-01-29
-- Descrição: Armazena códigos temporários para autorizar instalação de agentes

CREATE TABLE IF NOT EXISTS agent_activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    max_uses INTEGER DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_user_id VARCHAR(100),
    created_by_user_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON agent_activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_active ON agent_activation_codes(is_active, expires_at);

-- Comentários
COMMENT ON TABLE agent_activation_codes IS 'Códigos de ativação temporários para autorizar instalação de agentes';
COMMENT ON COLUMN agent_activation_codes.code IS 'Código único no formato XXXX-XXXX-XXXX';
COMMENT ON COLUMN agent_activation_codes.max_uses IS '0 = ilimitado';
COMMENT ON COLUMN agent_activation_codes.times_used IS 'Quantas vezes o código foi usado';

-- Verificar criação
SELECT table_name FROM information_schema.tables WHERE table_name = 'agent_activation_codes';
