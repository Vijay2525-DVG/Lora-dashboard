-- =============================================
-- Complete LoRa Monitoring Database Schema
-- From project start to current state (consolidated + idempotent)
-- =============================================

-- Database creation
CREATE DATABASE IF NOT EXISTS lora_monitoring;
USE lora_monitoring;

-- =============================================
-- 1. Users Table (base)
-- =============================================
DROP TABLE IF EXISTS user_config, lands, alert_settings, sensor_data, devices, users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test users
INSERT INTO users (username, password_hash, role) VALUES 
('testuser', '$2a$10$Xj60HjBM5gYiJrUn1cfks.mdDrftDtRfp6apqwkww2erYXkBr2iJG', 'admin'),
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'); -- password: "admin123" (bcrypt from server.js)

-- =============================================
-- 2. Lands Table (user fields/areas)
-- =============================================
CREATE TABLE lands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_sensors INT DEFAULT 0,
    active_sensors INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- 3. Devices Table (full with all columns)
-- =============================================
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    land_id INT,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(100),
    last_seen DATETIME NULL,
    field_row INT DEFAULT 1,
    field_col INT DEFAULT 1,
    field_name VARCHAR(50) DEFAULT 'Field A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE SET NULL
);

-- =============================================
-- 4. Sensor Data Table
-- =============================================
CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    soil INT,
    temperature FLOAT,
    humidity FLOAT,
    rssi INT,
    battery FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device_time (device_id, created_at)
);

-- =============================================
-- 5. Alert Settings Table
-- =============================================
CREATE TABLE alert_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    max_temp FLOAT,
    min_temp FLOAT,
    max_humidity FLOAT,
    min_humidity FLOAT,
    min_soil INT,
    max_soil INT,
    offline_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_device_user (user_id, device_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- =============================================
-- 6. User Config Table (limits)
-- =============================================
CREATE TABLE user_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    max_lands INT DEFAULT 5,
    max_sensors_per_land INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_device_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_user_device ON alert_settings(user_id, device_id);

-- =============================================
-- Sample Data (optional)
-- =============================================
-- Sample land for testuser
INSERT INTO lands (user_id, name, description, latitude, longitude) VALUES 
(1, 'Test Field A', 'Demo agricultural field', 13.0823, 80.2707);

-- Sample devices
INSERT INTO devices (id, user_id, land_id, name, latitude, longitude, location_name, field_row, field_col, field_name) VALUES 
('NODE_01', 1, 1, 'Soil Sensor 1', 13.0823, 80.2707, 'Greenhouse Center', 1, 1, 'Field A'),
('NODE_02', 1, 1, 'Soil Sensor 2', 13.0825, 80.2709, 'Greenhouse Edge', 1, 2, 'Field A');

-- Sample sensor data
INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi, battery) VALUES 
('NODE_01', 1800, 28.5, 65.2, -85, 3.7),
('NODE_02', 1650, 29.1, 68.4, -92, 3.6);

-- Sample alerts
INSERT INTO alert_settings (user_id, device_id, max_temp, min_temp, min_soil, offline_minutes) VALUES 
(1, 'NODE_01', 40, 10, 1500, 30);

-- Sample user config
INSERT INTO user_config (user_id, max_lands, max_sensors_per_land) VALUES 
(1, 5, 10);

-- =============================================
-- Complete! Schema matches server.js ensureSchema + all migrations
-- To setup: mysql -u root -pVIJAYrh@123 lora_monitoring < proper_database.sql
-- =============================================

