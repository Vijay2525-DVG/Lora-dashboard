-- Script to update device names from "Node X" to "Device X"
UPDATE devices SET name = 'Device 1' WHERE id = 'NODE_01';
UPDATE devices SET name = 'Device 2' WHERE id = 'NODE_02';
UPDATE devices SET name = 'Device 3' WHERE id = 'NODE_03';

-- Verify the changes
SELECT * FROM devices;
