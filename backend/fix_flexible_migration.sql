-- Fixed Migration: Add flexible scheduling (MySQL 5.7 compatible)
USE lora_monitoring;

-- Drop if failed previously
DROP TABLE IF EXISTS pump_sequences;

-- Add columns one by one (MySQL ADD COLUMN IF NOT EXISTS syntax issue)
SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'lora_monitoring' AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'start_datetime';
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE schedules ADD COLUMN start_datetime DATETIME NULL COMMENT ''For anytime/mid-time starts''', 
  'SELECT ''start_datetime already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'lora_monitoring' AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'sequence_id';
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE schedules ADD COLUMN sequence_id INT NULL COMMENT ''Group for multi-pump sequences''', 
  'SELECT ''sequence_id already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'lora_monitoring' AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'offset_minutes';
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE schedules ADD COLUMN offset_minutes INT DEFAULT 0 COMMENT ''Start N minutes after sequence start''', 
  'SELECT ''offset_minutes already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- irrigation_logs columns
SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'lora_monitoring' AND TABLE_NAME = 'irrigation_logs' AND COLUMN_NAME = 'sequence_id';
SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE irrigation_logs ADD COLUMN sequence_id INT NULL', 
  'SELECT ''sequence_id logs already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- pump_sequences table
CREATE TABLE IF NOT EXISTS pump_sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  land_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  duration_total INT DEFAULT 60,
  ai_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY(land_id),
  FOREIGN KEY (land_id) REFERENCES lands(id)
);

-- Sample data (safe INSERT IGNORE)
INSERT IGNORE INTO pump_sequences (land_id, name) VALUES
(1, 'Field 1 Full Irrigation'),
(2, 'Field 2 Lights + Pump');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_flexible ON schedules(start_datetime, sequence_id);
CREATE INDEX IF NOT EXISTS idx_logs_sequence ON irrigation_logs(sequence_id);

SELECT 'Migration completed successfully!' as status;

