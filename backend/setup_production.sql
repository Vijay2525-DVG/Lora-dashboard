-- Production Setup: Create DB + Irrigation Schema
-- Run: mysql -u root -p < backend/setup_production.sql

CREATE DATABASE IF NOT EXISTS lora_monitoring;
USE lora_monitoring;

-- 1. Core tables (no FK dependencies)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id INT,
  type ENUM('sensor', 'pump', 'light') DEFAULT 'sensor',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name VARCHAR(100),
  land_id INT,
  status ENUM('offline', 'online', 'idle', 'running') DEFAULT 'offline',
  voltage DECIMAL(5,2) DEFAULT NULL,
  current DECIMAL(5,3) DEFAULT NULL,
  power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal',
  last_seen TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  soil INT,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  rssi INT,
  battery DECIMAL(5,2),
  voltage DECIMAL(5,2),
  current DECIMAL(5,3),
  power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Lands table
CREATE TABLE IF NOT EXISTS lands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add FK constraints (safe after tables exist)
ALTER TABLE devices ADD CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE devices ADD CONSTRAINT fk_devices_land FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE SET NULL;
ALTER TABLE sensor_data ADD CONSTRAINT fk_sensor_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;
ALTER TABLE lands ADD CONSTRAINT fk_lands_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Irrigation tables
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NULL,
  device_id VARCHAR(50) NOT NULL,
  type ENUM('pump', 'light') NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  repeat_pattern ENUM('daily', 'weekly', 'once') DEFAULT 'daily',
  day_of_week INT NULL COMMENT '1=Mon..7=Sun',
  status ENUM('active', 'paused', 'completed') DEFAULT 'active',
  next_run DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS irrigation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NULL,
  device_id VARCHAR(50) NOT NULL,
  action ENUM('start', 'stop') NOT NULL,
  reason ENUM('manual', 'scheduled', 'ai_moisture_low', 'power_resume', 'auto') NOT NULL,
  duration_minutes INT,
  soil_moisture_avg INT,
  voltage_at_start DECIMAL(5,2),
  ai_confidence DECIMAL(3,2) DEFAULT NULL,
  status ENUM('completed', 'interrupted_power', 'manual_stop') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id),
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- 5. Alert settings
CREATE TABLE IF NOT EXISTS alert_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  max_temp DECIMAL(5,2),
  min_temp DECIMAL(5,2),
  max_humidity DECIMAL(5,2),
  min_humidity DECIMAL(5,2),
  min_soil INT,
  max_soil INT,
  offline_minutes INT DEFAULT 30,
  min_voltage DECIMAL(5,2) DEFAULT 200,
  voltage_outage_threshold INT DEFAULT 180,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_device_user (user_id, device_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- 6. User config
CREATE TABLE IF NOT EXISTS user_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  max_lands INT DEFAULT 5,
  max_sensors_per_land INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Sample admin user (password: admin123 hashed)
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (username, password_hash, role) VALUES 
('testuser', '$2a$10$K.0Z8e4Y6wN2vX8pQ3k5O2uY5J3k9P8O2uY5J3k9P8O2uY5J3k9P', 'admin');

-- 8. Sample devices
INSERT IGNORE INTO devices (id, name, user_id, type) VALUES 
('SENSOR_01', 'Field Sensor', 1, 'sensor'),
('PUMP_01', 'Main Pump', 1, 'pump'),
('PUMP_02', 'Zone 2 Pump', 1, 'pump'),
('LIGHT_01', 'Field Lights', 1, 'light');

-- Sample schedule
INSERT IGNORE INTO schedules (device_id, type, start_time, duration_minutes) VALUES
('PUMP_01', 'pump', '14:00:00', 30),
('LIGHT_01', 'light', '18:00:00', 120);

-- Ready for backend/frontend!
PRINT '✅ Irrigation database ready!';

