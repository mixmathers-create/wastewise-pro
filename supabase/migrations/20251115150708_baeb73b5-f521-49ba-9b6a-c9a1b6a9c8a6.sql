-- Add device fingerprint column for audit logging
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS device_fingerprint text;

COMMENT ON COLUMN schedules.device_fingerprint IS 'Unique device identifier for audit trail of approvals';