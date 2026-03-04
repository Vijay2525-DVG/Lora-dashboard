-- Alert Settings Table for LoRa Monitoring
-- Run this SQL to create the alerts table

USE lora_monitoring;

-- Create alert_settings table
CREATE TABLE IF NOT EXISTS alert_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    max_temp FLOAT,
    min_temp FLOAT,
    max_humidity FLOAT,
    min_humidity FLOAT,
    min_soil INT,
    max_soil INT,
    offline_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_device_user (user_id, device_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Example: Set alerts for a device
-- INSERT INTO alert_settings (user_id, device_id, max_temp, min_temp, min_soil, offline_minutes) 
-- VALUES (1, 'NODE_01', 40, 10, 1500, 30);

-- This means:
-- - Alert if temperature > 40°C or < 10°C
-- - Alert if soil moisture < 1500 ADC (time to water!)
-- - Alert if device is offline for more than 30 minutes

