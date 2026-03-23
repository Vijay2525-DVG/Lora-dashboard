import { db } from './db.js';

async function safeMigration() {
  const tables = ['schedules', 'irrigation_logs'];
  const newCols = {
    schedules: [
      'sequence_order INT DEFAULT 0',
      'dependencies JSON',
      'ai_enabled BOOLEAN DEFAULT FALSE',
      'ai_moisture_threshold INT DEFAULT 1500',
      'ai_temp_factor FLOAT DEFAULT 1.0',
      'ai_humidity_factor FLOAT DEFAULT 1.0',
      'status_message TEXT'
    ],
    irrigation_logs: [
      'ai_score FLOAT',
      'power_status VARCHAR(20) DEFAULT "normal"',
      'sequence_id INT',
      'weather_condition VARCHAR(50) DEFAULT "unknown"'
    ]
  };

  for (const [table, cols] of Object.entries(newCols)) {
    for (const colDef of cols) {
      const col = colDef.split(' ')[0];
      const [rows] = await db.query(`SHOW COLUMNS FROM ${table} LIKE '${col}'`);
      if (rows.length === 0) {
        const sql = `ALTER TABLE ${table} ADD COLUMN ${colDef}`;
        await db.query(sql);
        console.log(`✅ Added ${table}.${col}`);
      } else {
        console.log(`ℹ️ ${table}.${col} exists`);
      }
    }
  }

  // Create ai_decisions if not exists
  const [aiTables] = await db.query("SHOW TABLES LIKE 'ai_decisions'");

  if (aiTables.length === 0) {

    await db.query(`CREATE TABLE ai_decisions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      land_id INT,
      avg_soil INT,
      avg_temp FLOAT,
      avg_humidity FLOAT,
      calculated_duration INT,
      ai_confidence FLOAT,
      action_taken ENUM('irrigate', 'skip', 'adjust') DEFAULT 'skip',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (land_id)
    )`);
    console.log('✅ Created ai_decisions table');
  }

  console.log('🎉 Safe migration complete!');
}

safeMigration().catch(console.error);

