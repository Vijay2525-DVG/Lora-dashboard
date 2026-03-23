-- Advanced Irrigation Scheduling Schema Update
USE lora_monitoring;

-- Update schedules table for sequences/AI
ALTER TABLE schedules 
ADD COLUMN sequence_order INT DEFAULT 0 COMMENT 'Execution order in sequence (0 = first)',
ADD COLUMN dependencies JSON DEFAULT NULL COMMENT '["PUMP1", "LIGHT2"] - wait for these to finish',
ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_moisture_threshold INT DEFAULT 1500,
ADD COLUMN ai_temp_factor FLOAT DEFAULT 1.0 COMMENT 'Duration multiplier per 5°C above 30',
ADD COLUMN ai_humidity_factor FLOAT DEFAULT 1.0,
ADD COLUMN status_message TEXT DEFAULT NULL COMMENT 'Power outage reason';

-- Enhanced irrigation_logs
ALTER TABLE irrigation_logs 
ADD COLUMN ai_score FLOAT COMMENT '0-1 AI confidence',
ADD COLUMN power_status VARCHAR(20) DEFAULT 'normal',
ADD COLUMN sequence_id INT NULL,
ADD COLUMN weather_condition VARCHAR(50) DEFAULT 'unknown';

-- AI decisions table
CREATE TABLE IF NOT EXISTS ai_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT,
  avg_soil INT,
  avg_temp FLOAT,
  avg_humidity FLOAT,
  calculated_duration INT,
  ai_confidence FLOAT,
  action_taken ENUM('irrigate', 'skip', 'adjust') DEFAULT 'skip',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Sample sequence: Field1 - LIGHT then PUMP1 then PUMP2
INSERT INTO schedules (land_id, device_id, type, start_time, duration_minutes, repeat_pattern, sequence_order, ai_enabled) VALUES
(1, 'LIGHT_01', 'light', '14:00:00', 5, 'daily', 0, FALSE),
(1, 'PUMP_01', 'pump', '14:05:00', 30, 'daily', 1, TRUE),
(1, 'PUMP_02', 'pump', '14:35:00', 20, 'daily', 2, FALSE);

-- Indexes
CREATE INDEX idx_schedules_sequence ON schedules(sequence_order, land_id);
CREATE INDEX idx_ai_decisions_land ON ai_decisions(land_id);

-- Run this to upgrade your scheduling system

