-- Reinstate foreign key constraints on collection_receipts
-- These will ensure referential integrity between collection receipts and other tables

ALTER TABLE collection_receipts 
ADD CONSTRAINT collection_receipts_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE collection_receipts 
ADD CONSTRAINT collection_receipts_truck_id_fkey 
FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT;

ALTER TABLE collection_receipts 
ADD CONSTRAINT collection_receipts_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT;