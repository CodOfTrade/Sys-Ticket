-- Migration: Add missing columns to timesheets table
-- Date: 2026-01-05
-- Description: Add approved, invoiced, pause_duration, and metadata columns

ALTER TABLE timesheets
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by_id uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp,
ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_id varchar(100),
ADD COLUMN IF NOT EXISTS pause_duration integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add foreign key for approved_by_id
ALTER TABLE timesheets
ADD CONSTRAINT IF NOT EXISTS fk_timesheets_approved_by
FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for approved status
CREATE INDEX IF NOT EXISTS idx_timesheets_approved ON timesheets(approved);

-- Create index for invoiced status
CREATE INDEX IF NOT EXISTS idx_timesheets_invoiced ON timesheets(invoiced);

-- Add comment
COMMENT ON COLUMN timesheets.approved IS 'Indica se o apontamento foi aprovado';
COMMENT ON COLUMN timesheets.approved_by_id IS 'ID do usuário que aprovou o apontamento';
COMMENT ON COLUMN timesheets.approved_at IS 'Data e hora da aprovação';
COMMENT ON COLUMN timesheets.invoiced IS 'Indica se o apontamento foi faturado';
COMMENT ON COLUMN timesheets.invoice_id IS 'ID da fatura/OS no SIGE Cloud';
COMMENT ON COLUMN timesheets.pause_duration IS 'Duração das pausas em minutos';
COMMENT ON COLUMN timesheets.metadata IS 'Metadados adicionais em formato JSON';
