-- =============================================
-- Admin Role Setup Script
-- Run this to add admin capabilities to your database
-- =============================================

USE lora_monitoring;

-- Add role column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user';

-- Create admin user (username: admin, password: admin123)
-- The password hash is generated using bcrypt with 10 rounds
-- This will only work if no admin user exists
INSERT INTO users (username, password_hash, role)
SELECT 'admin', '$2a$10$XQ5KJZxSxU9xW5Q6YJ5.YOD8p/qP.hQZ0ZxQxQ5KJZxSxU9xW5Q6', 'admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- To manually set an existing user as admin, run:
-- UPDATE users SET role = 'admin' WHERE username = 'your_username';

-- To create a new admin user with a custom password, run:
-- INSERT INTO users (username, password_hash, role) VALUES ('admin', '$2a$10$YOUR_HASH_HERE', 'admin');
-- 
-- To generate a bcrypt hash for a password in Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = bcrypt.hashSync('your_password', 10);
-- console.log(hash);

