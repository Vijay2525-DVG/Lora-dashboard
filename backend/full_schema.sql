-- Full LoRa Irrigation Database Schema
-- Run: mysql -u root -p lora_monitoring < full_schema.sql

DROP DATABASE IF EXISTS lora_monitoring;
CREATE DATABASE lora_monitoring;
USE lora_monitoring;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2a$10$Lz8Z1vJ9wV7iJ7w5J3k5qO5J3k5qO5J3k5qO5J3k5qO5J3k5qO5J3k', 'admin');

-- Devices table (sensors, pumps, lights)
CREATE TABLE devices (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  type ENUM('sensor', 'pump', 'light') DEFAULT 'sensor',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name VARCHAR(100),
  land_id INT,
  status ENUM('offline', 'online', 'idle', 'running') DEFAULT 'offline',
  voltage DECIMAL(5,2) DEFAULT NULL,
  current DECIMAL(5,3) DEFAULT NULL,
  power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal',
  last_seen TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Sensor data
CREATE TABLE sensor_data (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Lands/Farms
CREATE TABLE lands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Alert settings
CREATE TABLE alert_settings (
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

-- Irrigation schedules
CREATE TABLE schedules (
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
  FOREIGN KEY (device_id) REFERENCES devices(id),
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Irrigation logs (manual/AI/scheduled)
CREATE TABLE irrigation_logs (
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

-- User config (limits)
CREATE TABLE user_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  max_lands INT DEFAULT 5,
  max_sensors_per_land INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sample test data
INSERT INTO devices (id, name, user_id, type, status) VALUES 
('SENSOR_01', 'Field Sensor 1', 1, 'sensor', 'online'),
('PUMP_01', 'Main Pump', 1, 'pump', 'idle'),
('LIGHT_01', 'Field Lights', 1, 'light', 'idle');

INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi, voltage) VALUES
('SENSOR_01', 1800, 28.5, 65.2, -85, 230);

INSERT INTO schedules (device_id, type, start_time, duration_minutes, repeat_pattern) VALUES
('PUMP_01', 'pump', '14:00:00', 30, 'daily'),
('LIGHT_01', 'light', '18:00:00', 120, 'daily');

-- Ready! Backend will auto-upgrade schema on restart.

