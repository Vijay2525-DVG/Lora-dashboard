-- =============================================
-- Create Admin User
-- Run this SQL in MySQL to create an admin account
-- Username: admin
-- Password: admin123
-- =============================================

USE lora_monitoring;

-- First add role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user';

-- Insert admin user with password hash for 'admin123'
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rsS/lW1pCPBJ3eGVjS', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

-- Verify the user was created/updated
SELECT id, username, role FROM users WHERE username = 'admin';

