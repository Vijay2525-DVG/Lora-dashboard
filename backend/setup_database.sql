-- =============================================
-- LoRa Monitoring Database Setup
-- =============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS lora_monitoring;
USE lora_monitoring;

-- =============================================
-- Devices Table
-- =============================================
DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(100),
    last_seen DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample devices with GPS coordinates
INSERT INTO devices (id, name, status, latitude, longitude, location_name) VALUES 
('NODE_01', 'Device 1', 'online', 14.4324, 75.9566, 'Main Location'),
('NODE_02', 'Device 2', 'offline', 14.4330, 75.9570, 'Secondary Location'),
('NODE_03', 'Device 3', 'offline', 14.4318, 75.9562, 'Tertiary Location');

-- =============================================
-- Sensor Data Table
-- =============================================
DROP TABLE IF EXISTS sensor_data;
CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    soil INT,
    temperature FLOAT,
    humidity FLOAT,
    rssi INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Create index for faster queries
CREATE INDEX idx_device_created ON sensor_data(device_id, created_at);

-- =============================================
-- Test Data (Optional - for testing)
-- =============================================
 INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi) VALUES 
 ('NODE_01', 2535, 28, 60, -103),
 ('NODE_02', 1870, 30, 55, -98),
 ('NODE_03', 2200, 26, 68, -110);
