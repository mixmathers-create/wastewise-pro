-- Drop foreign key constraints on collection_receipts to allow independent deletion
-- Collection receipts are historical records and should preserve IDs even if trucks/clients are deleted

ALTER TABLE collection_receipts 
DROP CONSTRAINT IF EXISTS collection_receipts_client_id_fkey;

ALTER TABLE collection_receipts 
DROP CONSTRAINT IF EXISTS collection_receipts_truck_id_fkey;

ALTER TABLE collection_receipts 
DROP CONSTRAINT IF EXISTS collection_receipts_driver_id_fkey;