-- =============================================
-- LoRa Monitoring Database Setup
-- =============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS lora_monitoring;
USE lora_monitoring;

-- =============================================
-- Users Table
-- =============================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Devices Table (owned by users)
-- =============================================
DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(100),
    last_seen DATETIME,
    field_row INT,
    field_col INT,
    field_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert a test user (for demo purposes)
-- IMPORTANT: Each new user will have their own devices they add through the app
INSERT INTO users (username, password_hash) VALUES 
('testuser', '$2a$10$Xj60HjBM5gYiJrUn1cfks.mdDrftDtRfp6apqwkww2erYXkBr2iJG'); -- password is "password" for demo

-- NOTE: No default devices are created here
-- Users must add their own devices through the web interface
-- This ensures proper data isolation between users

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
