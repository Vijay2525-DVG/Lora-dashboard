const { db } = require('./db.js');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const migrationFiles = [
    'create_schedules.sql',
    'add_actuator_type.sql',
    'add_power_status.sql',
    'irrigation_logs.sql',
    'add_ai_schedules.sql'
  ];

  try {
    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`\n📄 Executing migration: ${file}`);
      await db.promise().query(sql);
      console.log(`✅ ${file} completed successfully`);
    }
    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
  } finally {
    db.end();
  }
}

runMigrations();

