-- Migration: Add share3_length column if it doesn't exist
-- This column stores the length of share3 for proper reconstruction

-- Check if column exists and add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' 
        AND column_name = 'share3_length'
    ) THEN
        ALTER TABLE cards ADD COLUMN share3_length INTEGER;
        RAISE NOTICE 'Added share3_length column to cards table';
    ELSE
        RAISE NOTICE 'share3_length column already exists';
    END IF;
END $$;

-- Update existing records to set share3_length based on encrypted data
-- This assumes share3_encrypted is hex-encoded, so length = hex_length / 2
UPDATE cards 
SET share3_length = LENGTH(share3_encrypted) / 2 
WHERE share3_length IS NULL AND share3_encrypted IS NOT NULL;
