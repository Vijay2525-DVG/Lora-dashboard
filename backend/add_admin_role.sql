-- Add role column to users table
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';

-- Create admin user (username: admin, password: admin123)
-- This will only work if no admin exists
INSERT INTO users (username, password_hash, role)
SELECT 'admin', '$2a$10$XQ5KJZxSxU9xW5Q6YJ5.YOD8p/qP.hQZ0ZxQxQ5KJZxSxU9xW5Q6', 'admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Note: The password hash above is for 'admin123'
-- To create a new admin user manually, use:
-- INSERT INTO users (username, password_hash, role) VALUES ('admin', '$2a$10$...', 'admin');
-- The password hash is generated using bcrypt with 10 rounds
