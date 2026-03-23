const mysql = require('mysql2/promise');

async function runMigration() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'VIJAYrh@123',
    database: 'lora_monitoring'
  });

  const migrations = [
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS dependencies JSON`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_moisture_threshold INT DEFAULT 1500`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_temp_factor FLOAT DEFAULT 1.0`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_humidity_factor FLOAT DEFAULT 1.0`,
    `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status_message TEXT`,
    `ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS ai_score FLOAT`,
    `ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS power_status VARCHAR(20) DEFAULT 'normal'`,
    `ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS sequence_id INT`,
    `ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(50) DEFAULT 'unknown'`,
    `CREATE TABLE IF NOT EXISTS ai_decisions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      land_id INT,
      avg_soil INT,
      avg_temp FLOAT,
      avg_humidity FLOAT,
      calculated_duration INT,
      ai_confidence FLOAT,
      action_taken ENUM('irrigate', 'skip', 'adjust') DEFAULT 'skip',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (land_id) REFERENCES lands(id)
    )`
  ];

  try {
    for (const sql of migrations) {
      console.log(sql.substring(0, 50) + '...');
      await db.execute(sql);
      console.log('✅ Done');
    }
    console.log('🎉 AI Scheduling schema updated!');
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    await db.end();
  }
}

runMigration();

