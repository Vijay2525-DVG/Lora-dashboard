-- Migration: Track irrigation events (manual/AI)

USE lora_monitoring;

CREATE TABLE IF NOT EXISTS irrigation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NULL,
  device_id VARCHAR(50) NOT NULL,
  action ENUM('start', 'stop') NOT NULL,
  reason ENUM('manual', 'scheduled', 'ai_moisture_low', 'power_resume', 'auto') NOT NULL,
  duration_minutes INT,
  soil_moisture_avg INT COMMENT 'Average soil at start',
  voltage_at_start DECIMAL(5,2),
  ai_confidence FLOAT DEFAULT NULL COMMENT '0-1 for AI decisions',
  status ENUM('completed', 'interrupted_power', 'manual_stop') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_device (device_id),
  INDEX idx_land (land_id),
  INDEX idx_reason (reason),
  FOREIGN KEY (device_id) REFERENCES devices(id),
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

