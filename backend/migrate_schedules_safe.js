import { db } from './db.js';

async function safeMigration() {
  try {
    // 1. Check if table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'schedules'");
    if (tables.length > 0) {
      console.log('✅ schedules table already exists, skipping');
    } else {
      console.log('📄 Creating schedules table...');
      await db.query(`
        CREATE TABLE schedules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          land_id INT NULL,
          device_id VARCHAR(50) NOT NULL,
          type ENUM('pump', 'light') NOT NULL,
          start_time TIME NOT NULL,
          duration_minutes INT NOT NULL DEFAULT 30,
          repeat_pattern ENUM('daily', 'weekly', 'once') DEFAULT 'daily',
          day_of_week INT NULL,
          status ENUM('active', 'paused', 'completed') DEFAULT 'active',
          next_run DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_device (device_id),
          INDEX idx_land (land_id),
          INDEX idx_next_run (next_run)
        )
      `);
      console.log('✅ schedules table created');
    }

    // 2. Add pump/light devices if missing
    const [pumps] = await db.query("SELECT id FROM devices WHERE id = 'PUMP_01'");
    if (pumps.length === 0) {
      await db.query(`INSERT IGNORE INTO devices (id, name, status, user_id) VALUES 
        ('PUMP_01', 'Main Field Pump', 'offline', 1),
        ('PUMP_02', 'Zone 2 Pump', 'pump', 'offline', 1),
        ('LIGHT_01', 'Field Lights', 'light', 'offline', 1)
      `);
      console.log('✅ Sample pump/light devices ensured');
      console.log('✅ Sample pump/light devices added');
    }

    // 3. Add power columns if missing (safe ADD COLUMN IF NOT EXISTS not supported)
    try {
      await db.query("ALTER TABLE devices ADD COLUMN type ENUM('sensor', 'pump', 'light') DEFAULT 'sensor'");
      console.log('✅ Added type column to devices');
    } catch (e) {
      console.log('ℹ️ type column already exists, skipping');
    }

    const [sensorVoltage] = await db.query("SHOW COLUMNS FROM sensor_data LIKE 'voltage'");
    if (sensorVoltage.length === 0) {
      await db.query("ALTER TABLE sensor_data ADD COLUMN voltage DECIMAL(5,2) DEFAULT NULL");
      await db.query("ALTER TABLE sensor_data ADD COLUMN current DECIMAL(5,3) DEFAULT NULL");
      await db.query("ALTER TABLE sensor_data ADD COLUMN power_status ENUM('normal', 'low', 'outage') DEFAULT 'normal'");
      console.log('✅ Added power columns to sensor_data');
    }

    const [deviceVoltage] = await db.query("SHOW COLUMNS FROM devices LIKE 'voltage'");
    if (deviceVoltage.length === 0) {
      await db.query("ALTER TABLE devices ADD COLUMN voltage DECIMAL(5,2) DEFAULT NULL");
      await db.query("ALTER TABLE devices ADD COLUMN current DECIMAL(5,3) DEFAULT NULL");
      console.log('✅ Added power columns to devices');
    }

    // 4. Irrigation logs table
    const [logsTables] = await db.query("SHOW TABLES LIKE 'irrigation_logs'");
    if (logsTables.length === 0) {
      await db.query(`
        CREATE TABLE irrigation_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          land_id INT NULL,
          device_id VARCHAR(50) NOT NULL,
          action ENUM('start', 'stop') NOT NULL,
          reason ENUM('manual', 'scheduled', 'ai_moisture_low', 'power_resume', 'auto') NOT NULL,
          duration_minutes INT,
          soil_moisture_avg INT,
          voltage_at_start DECIMAL(5,2),
          ai_confidence FLOAT DEFAULT NULL,
          status ENUM('completed', 'interrupted_power', 'manual_stop') DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_device (device_id),
          INDEX idx_land (land_id)
        )
      `);
      console.log('✅ irrigation_logs table created');
    }

    // 5. Extend alert_settings
    const [alertVoltage] = await db.query("SHOW COLUMNS FROM alert_settings LIKE 'min_voltage'");
    if (alertVoltage.length === 0) {
      await db.query("ALTER TABLE alert_settings ADD COLUMN min_voltage DECIMAL(5,2) DEFAULT 200");
      await db.query("ALTER TABLE alert_settings ADD COLUMN voltage_outage_threshold INT DEFAULT 180");
      console.log('✅ Extended alert_settings for power monitoring');
    }

    console.log('\n🎉 ALL IRRIGATION MIGRATIONS COMPLETED SUCCESSFULLY! 🚀');
    console.log('✅ Tables ready: schedules, irrigation_logs + extended devices/sensor_data');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await db.end();
  }
}

safeMigration();

