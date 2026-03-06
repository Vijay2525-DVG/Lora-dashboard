// Test script to verify alerts are working
// Run with: node test_alerts.js

const mysql = require('mysql2/promise');

async function testAlerts() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "VIJAYrh@123",
      database: "lora_monitoring"
    });

    console.log('✅ Connected to database\n');

    // Check if alert_settings table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'alert_settings'");
    if (tables.length === 0) {
      console.log('❌ alert_settings table does NOT exist!');
      console.log('   Please restart your backend server to create it.');
      return;
    }
    console.log('✅ alert_settings table exists');

    // Check for existing alert configurations
    const [configs] = await connection.query("SELECT * FROM alert_settings");
    console.log(`\n📊 Alert configurations: ${configs.length}`);
    
    if (configs.length === 0) {
      console.log('❌ No alert configurations found!');
      console.log('   Go to frontend → Alerts → Configure New → Save settings');
      return;
    }

    console.log('\n📋 Configured devices:');
    configs.forEach(c => {
      console.log(`   - ${c.device_id}: temp ${c.min_temp}-${c.max_temp}°C, soil ${c.min_soil}-${c.max_soil}`);
    });

    // Check devices with their latest sensor data
    const [devices] = await connection.query(`
      SELECT d.id, d.name, d.status, d.last_seen,
             sd.soil, sd.temperature, sd.humidity, sd.created_at as last_update
      FROM devices d
      LEFT JOIN (
        SELECT device_id, soil, temperature, humidity, created_at
        FROM sensor_data
        WHERE (device_id, created_at) IN (
          SELECT device_id, MAX(created_at) FROM sensor_data GROUP BY device_id
        )
      ) sd ON d.id = sd.device_id
    `);

    console.log('\n📡 Devices and latest data:');
    const now = new Date();
    
    devices.forEach(device => {
      console.log(`\n   ${device.name} (${device.id}):`);
      console.log(`      Status: ${device.status}`);
      console.log(`      Temperature: ${device.temperature}°C`);
      console.log(`      Humidity: ${device.humidity}%`);
      console.log(`      Soil: ${device.soil}`);
      console.log(`      Last seen: ${device.last_seen}`);
      
      // Check each device against its thresholds
      const config = configs.find(c => c.device_id === device.id);
      if (config) {
        const alerts = [];
        
        // Check temperature
        if (device.temperature !== null && config.max_temp && device.temperature > config.max_temp) {
          alerts.push(`🔥 HIGH TEMP: ${device.temperature}°C > ${config.max_temp}°C`);
        }
        if (device.temperature !== null && config.min_temp && device.temperature < config.min_temp) {
          alerts.push(`❄️ LOW TEMP: ${device.temperature}°C < ${config.min_temp}°C`);
        }
        
        // Check humidity
        if (device.humidity !== null && config.max_humidity && device.humidity > config.max_humidity) {
          alerts.push(`💨 HIGH HUMIDITY: ${device.humidity}% > ${config.max_humidity}%`);
        }
        if (device.humidity !== null && config.min_humidity && device.humidity < config.min_humidity) {
          alerts.push(`🏜️ LOW HUMIDITY: ${device.humidity}% < ${config.min_humidity}%`);
        }
        
        // Check soil
        if (device.soil !== null && config.min_soil && device.soil < config.min_soil) {
          alerts.push(`💧 LOW SOIL (water!): ${device.soil} < ${config.min_soil}`);
        }
        if (device.soil !== null && config.max_soil && device.soil > config.max_soil) {
          alerts.push(`🌊 HIGH SOIL (stop water): ${device.soil} > ${config.max_soil}`);
        }
        
        // Check offline
        if (device.last_seen && config.offline_minutes) {
          const lastSeen = new Date(device.last_seen);
          const minutesOffline = (now - lastSeen) / (1000 * 60);
          if (minutesOffline > config.offline_minutes) {
            alerts.push(`📡 OFFLINE: ${Math.round(minutesOffline)} min > ${config.offline_minutes} min`);
          }
        }
        
        if (alerts.length > 0) {
          console.log('      🚨 ALERTS:');
          alerts.forEach(a => console.log(`         ${a}`));
        } else {
          console.log('      ✅ No alerts (values within thresholds)');
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testAlerts();
