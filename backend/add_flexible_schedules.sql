-- Migration: Add flexible anytime scheduling and sequences
-- Supports mid-time/anytime pump starts, multi-pump per field

USE lora_monitoring;

-- Add flexible start_datetime (overrides start_time for ad-hoc)
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS start_datetime DATETIME NULL COMMENT 'For anytime/mid-time starts (overrides start_time)',
ADD COLUMN IF NOT EXISTS sequence_id INT NULL COMMENT 'Group for multi-pump sequences',
ADD COLUMN IF NOT EXISTS offset_minutes INT DEFAULT 0 COMMENT 'Start N minutes after sequence start';

-- Ensure irrigation_logs supports all reasons/status
ALTER TABLE irrigation_logs 
ADD COLUMN IF NOT EXISTS sequence_id INT NULL,
ADD COLUMN IF NOT EXISTS power_status_at_start ENUM('normal', 'low', 'outage') DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS resume_from_outage BOOLEAN DEFAULT FALSE;

-- Create sequences table if needed
CREATE TABLE IF NOT EXISTS pump_sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'e.g. Field1 Morning Sequence',
  duration_total INT DEFAULT 60 COMMENT 'Total sequence duration (min)',
  ai_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Sample sequence data
INSERT IGNORE INTO pump_sequences (land_id, name) VALUES
(1, 'Field 1 Full Irrigation'),
(1, 'Field 1 Lights + Pump');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_flexible ON schedules(start_datetime, sequence_id);
CREATE INDEX IF NOT EXISTS idx_logs_sequence ON irrigation_logs(sequence_id);

-- Sample flexible schedule
INSERT IGNORE INTO schedules (device_id, type, start_time, duration_minutes, repeat_pattern, sequence_id, ai_enabled) VALUES
('PUMP_01', 'pump', '14:00:00', 30, 'daily', 1, TRUE),
('PUMP_02', 'pump', '14:20:00', 20, 'daily', 1, FALSE);

-- Run: mysql < add_flexible_schedules.sql

