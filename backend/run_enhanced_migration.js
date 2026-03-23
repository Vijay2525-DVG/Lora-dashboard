import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'VIJAYrh@123',
  database: 'lora_monitoring'
};

async function runMigration(sqlFile) {
  try {
    const sqlPath = path.join(process.cwd(), 'backend', sqlFile);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log(`🔄 Running migration: ${sqlFile}`);
    
    await connection.execute(sqlContent);
    console.log(`✅ ${sqlFile} completed successfully`);
    
    await connection.end();
  } catch (err) {
    console.error(`❌ Error in ${sqlFile}:`, err.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Running Enhanced Irrigation Migrations...\n');
  
const migrations = [
    'fix_flexible_migration.sql',
    'enhance_ai.sql'
  ];
  
  for (const migration of migrations) {
    if (!fs.existsSync(path.join('backend', migration))) {
      console.error(`❌ Missing migration file: backend/${migration}`);
      process.exit(1);
    }
    await runMigration(migration);
  }
  
  console.log('\n🎉 All enhanced migrations completed! Restart server.');
}

main().catch(console.error);

