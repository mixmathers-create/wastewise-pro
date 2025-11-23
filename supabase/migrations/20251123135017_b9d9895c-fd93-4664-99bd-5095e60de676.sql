-- Add tally_entries field to collection_receipts to store individual entries
ALTER TABLE collection_receipts ADD COLUMN tally_entries jsonb DEFAULT '[]'::jsonb;