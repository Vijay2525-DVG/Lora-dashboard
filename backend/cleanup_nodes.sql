-- Remove old NODE devices
DELETE FROM sensor_data WHERE device_id LIKE 'NODE_%';
DELETE FROM devices WHERE id LIKE 'NODE_%';
