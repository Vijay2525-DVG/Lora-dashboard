-- Migration: Add power monitoring to track electricity outages

USE lora_monitoring;

-- Add to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS voltage DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS current DECIMAL(5,3) DEFAULT NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal';

-- Add to sensor_data table  
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS voltage DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS current DECIMAL(5,3) DEFAULT NULL;
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal';

-- Extend alerts for power
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS min_voltage DECIMAL(5,2) DEFAULT 200;
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS voltage_outage_threshold INT DEFAULT 180;

