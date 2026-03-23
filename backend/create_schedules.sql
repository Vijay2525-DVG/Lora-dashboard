-- Migration: Create schedules table for irrigation/pump/light scheduling
-- Add to irrigation system

USE lora_monitoring;

CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NULL,
  device_id VARCHAR(50) NOT NULL,
  type ENUM('pump', 'light') NOT NULL,
  start_time TIME NOT NULL,  -- e.g. '14:30:00'
  duration_minutes INT NOT NULL DEFAULT 30,
  repeat_pattern ENUM('daily', 'weekly', 'once') DEFAULT 'daily',
  day_of_week INT NULL COMMENT '1=Mon,7=Sun for weekly',
  status ENUM('active', 'paused', 'completed') DEFAULT 'active',
  next_run DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_device (device_id),
  INDEX idx_land (land_id),
  INDEX idx_next_run (next_run),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE CASCADE
);

-- Sample data
INSERT INTO schedules (device_id, type, start_time, duration_minutes, repeat_pattern) VALUES
('PUMP_01', 'pump', '14:00:00', 45, 'daily'),
('LIGHT_01', 'light', '18:00:00', 120, 'daily');

