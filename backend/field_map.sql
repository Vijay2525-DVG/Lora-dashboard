-- Add location fields to devices table for grid mapping
ALTER TABLE devices ADD COLUMN IF NOT EXISTS field_row INT DEFAULT 1;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS field_col INT DEFAULT 1;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS field_name VARCHAR(50) DEFAULT 'Field A';

-- Example update queries to set locations:
-- UPDATE devices SET field_row = 1, field_col = 1, field_name = 'Field A' WHERE id = 'device_1';
-- UPDATE devices SET field_row = 1, field_col = 2, field_name = 'Field A' WHERE id = 'device_2';
-- UPDATE devices SET field_row = 2, field_col = 1, field_name = 'Field B' WHERE id = 'device_3';
