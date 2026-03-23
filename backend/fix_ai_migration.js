import { db } from './db.js';

async function addAIColumns() {
  const schemaUpdates = [
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS dependencies JSON',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_moisture_threshold INT DEFAULT 1500',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_temp_factor FLOAT DEFAULT 1.0',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ai_humidity_factor FLOAT DEFAULT 1.0',
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status_message TEXT',
    'ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS ai_score FLOAT',
    'ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS power_status VARCHAR(20) DEFAULT "normal"',
    'ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS sequence_id INT',
    'ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(50) DEFAULT "unknown"',
    'CREATE TABLE IF NOT EXISTS ai_decisions (id INT AUTO_INCREMENT PRIMARY KEY, land_id INT, avg_soil INT, avg_temp FLOAT, avg_humidity FLOAT, calculated_duration INT, ai_confidence FLOAT, action_taken ENUM("irrigate", "skip", "adjust") DEFAULT "skip", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (land_id) REFERENCES lands(id))'
  ];

  try {
    for (const sql of schemaUpdates) {
      await db.query(sql);
      console.log(`✅ Added: ${sql.split(' ')[0]} ${sql.split(' ')[2]}`);
    }
    console.log('🎉 AI schema migration complete!');
  } catch (err) {
    console.log('⚠️ Some columns exist:', err.message);
  }
}

addAIColumns();

