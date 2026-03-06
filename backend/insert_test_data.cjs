// Insert test sensor data to demonstrate alerts
const mysql = require('mysql2/promise');

async function insertTestData() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "VIJAYrh@123",
    database: "lora_monitoring"
  });

  // Insert test data with values that will trigger alerts
  await connection.execute(`
    INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi) VALUES 
    ('beside hostel', 1200, 42, 15, -100),
    ('football field', 3500, 25, 80, -95),
    ('infront of college', 1000, 5, 10, -110)
  `);

  // Also update last_seen to trigger offline alerts
  await connection.execute(`
    UPDATE devices SET last_seen = DATE_SUB(NOW(), INTERVAL 45 MINUTE) WHERE id = 'beside hostel'
  `);

  console.log('✅ Test data inserted!');
  console.log('');
  console.log('Expected alerts:');
  console.log('  🔥 beside hostel: Temperature 42°C > 38°C (HIGH)');
  console.log('  💧 beside hostel: Soil 1200 < 1500 (LOW - needs water!)');
  console.log('  🏜️ infront of college: Temperature 5°C < 10°C (LOW)');
  console.log('  🏜️ infront of college: Humidity 10% < 20% (LOW)');
  console.log('  💧 infront of college: Soil 1000 < 1500 (LOW - needs water!)');
  console.log('  🌊 football field: Soil 3500 > 3000 (HIGH - stop watering!)');
  console.log('  📡 All devices: last_seen > 30 min ago (OFFLINE warning)');
  
  await connection.end();
}

insertTestData().catch(console.error);
