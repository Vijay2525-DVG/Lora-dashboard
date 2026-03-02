-- Script to restore original NODE devices

-- First delete all existing devices and their data
DELETE FROM sensor_data;
DELETE FROM devices;

-- Insert the original NODE devices
INSERT INTO devices (id, name, status, latitude, longitude, location_name) VALUES 
('NODE_01', 'Device 1', 'offline', 13.0823, 80.2707, 'Location 1'),
('NODE_02', 'Device 2', 'offline', 13.0828, 80.2712, 'Location 2'),
('NODE_03', 'Device 3', 'offline', 13.0833, 80.2717, 'Location 3');

-- Insert some sample sensor data for each node
INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi) VALUES 
('NODE_01', 2535, 28, 60, -103),
('NODE_02', 1870, 30, 55, -98),
('NODE_03', 2200, 26, 68, -110);

SELECT * FROM devices;
SELECT * FROM sensor_data;
