-- Migration: Enhance AI for moisture/power/events handling
USE lora_monitoring;

-- Enhance ai_decisions table
CREATE TABLE IF NOT EXISTS ai_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT,
  avg_soil INT,
  avg_temp FLOAT,
  avg_humidity FLOAT,
  voltage_avg DECIMAL(5,2),
  ai_confidence FLOAT COMMENT '0-1',
  factors JSON COMMENT '{"temp_multiplier":1.2, "humidity_factor":0.8}',
  recommended_action ENUM('irrigate', 'skip', 'sequence', 'alert') DEFAULT 'skip',
  action_taken ENUM('executed', 'skipped') DEFAULT 'skipped',
  duration_suggested INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(idx_land_time)(land_id, created_at)
) ENGINE=InnoDB;

-- Outage alerts table for messaging
CREATE TABLE IF NOT EXISTS outage_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NULL,
  message TEXT NOT NULL COMMENT 'User-facing alert e.g. Power back - resuming irrigation',
  severity ENUM('info', 'warning', 'critical') DEFAULT 'warning',
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Update schedules for better AI
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS ai_humidity_threshold INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS predicted_duration INT COMMENT 'AI-calculated duration';

-- Sample AI decision
INSERT IGNORE INTO ai_decisions (land_id, avg_soil, avg_temp, avg_humidity, ai_confidence, recommended_action) VALUES
(1, 1200, 32.5, 35, 0.85, 'sequence');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_land ON ai_decisions(land_id);
CREATE INDEX IF NOT EXISTS idx_outage_time ON outage_alerts(created_at DESC);

-- Run: mysql < enhance_ai.sql

