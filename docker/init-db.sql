-- Script de inicialização do banco de dados
-- Executado automaticamente quando o container PostgreSQL é criado

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca full-text

-- Criar usuário adicional se necessário
-- CREATE USER sys_ticket_readonly WITH PASSWORD 'readonly_password';

-- Comentários
COMMENT ON DATABASE sys_ticket_db IS 'Banco de dados do sistema Sys-Ticket';

-- Configurações de performance (ajuste conforme necessário)
ALTER DATABASE sys_ticket_db SET timezone TO 'America/Sao_Paulo';
