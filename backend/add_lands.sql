-- =============================================
-- Land/Farm Management Migration
-- =============================================

USE lora_monitoring;

-- =============================================
-- User Configuration Table (for admin limits)
-- =============================================
DROP TABLE IF EXISTS user_config;
CREATE TABLE user_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    max_lands INT DEFAULT 5,
    max_sensors_per_land INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- Lands/Farms Table
-- =============================================
DROP TABLE IF EXISTS lands;
CREATE TABLE lands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_sensors INT DEFAULT 0,
    active_sensors INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- Update devices table to link to land
-- =============================================
ALTER TABLE devices ADD COLUMN land_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE devices ADD FOREIGN KEY (land_id) REFERENCES lands(id);

-- =============================================
-- Insert default config for existing users
-- =============================================
INSERT INTO user_config (user_id, max_lands, max_sensors_per_land)
SELECT id, 5, 10 FROM users
ON DUPLICATE KEY UPDATE max_lands = 5, max_sensors_per_land = 10;

