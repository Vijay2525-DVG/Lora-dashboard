-- Migration: Add actuator type to devices table
-- Supports pumps/lights alongside sensors

USE lora_monitoring;

-- Add type column if not exists
ALTER TABLE devices ADD COLUMN IF NOT EXISTS type ENUM('sensor', 'pump', 'light') DEFAULT 'sensor';

-- Create sample actuators
INSERT IGNORE INTO devices (id, name, type, status, user_id) VALUES
('PUMP_01', 'Main Field Pump', 'pump', 'offline', 1),
('PUMP_02', 'Zone 2 Pump', 'pump', 'offline', 1),
('LIGHT_01', 'Field Lights', 'light', 'offline', 1);

