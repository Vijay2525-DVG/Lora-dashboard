-- Add GPS coordinates to devices table
ALTER TABLE devices ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE devices ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE devices ADD COLUMN location_name VARCHAR(100);

-- Example update queries:
-- UPDATE devices SET latitude = 13.0823, longitude = 80.2707, location_name = 'Greenhouse 1' WHERE id = 'device_1';
-- UPDATE devices SET latitude = 13.0825, longitude = 80.2709, location_name = 'Greenhouse 2' WHERE id = 'device_2';
