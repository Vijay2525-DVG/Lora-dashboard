-- Script to fix device ownership issues
-- Run this to clean up devices and ensure proper user isolation

USE lora_monitoring;

-- First, let's see what we have
SELECT 'Current Devices:' as '';
SELECT id, user_id, name FROM devices;

-- Delete all existing devices (they're likely all owned by user 1)
DELETE FROM sensor_data;
DELETE FROM devices;

-- Delete all alert settings
DELETE FROM alert_settings;

-- Verify cleanup
SELECT 'After cleanup:' as '';
SELECT id, user_id, name FROM devices;

-- Now users will need to add their own devices through the app
-- This ensures each user has their own isolated devices
