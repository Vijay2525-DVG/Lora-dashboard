import express from "express";
import cors from "cors";
import { db } from "./db.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import IrrigationScheduler from './scheduler.js';
import irrigationLogsRouter from './irrigation-logs.js';


// secret used to sign JWTs; in production set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || "supersecret123";

const app = express();
app.use(cors());
app.use(express.json());

// automatically ensure needed schema changes are present
async function ensureSchema() {
  try {
    // create users table if missing
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if role column exists, add if not
    try {
      await db.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'");
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Create admin user if not exists (password: admin123)
const [existingTestuser] = await db.query("SELECT id FROM users WHERE username = 'testuser'");
    if (existingTestuser.length === 0) {
      const adminHash = await bcrypt.hash('admin', 10);
      await db.query(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
        ['testuser', adminHash]
      );
      console.log("Admin user 'testuser' (password: admin) created");
    }

    // add user_id column to devices if it doesn't exist (MySQL doesn't support ADD COLUMN IF NOT EXISTS on older versions)
    const [cols] = await db.query("SHOW COLUMNS FROM devices LIKE 'user_id'");
    if (cols.length === 0) {
      await db.query(
        "ALTER TABLE devices ADD COLUMN user_id INT NOT NULL DEFAULT 1"
      );
    }

    // ensure foreign key exists
    const [fks] = await db.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'user_id'
         AND REFERENCED_TABLE_NAME = 'users'`
    );
    if (fks.length === 0) {
      try {
        await db.query("ALTER TABLE devices ADD FOREIGN KEY (user_id) REFERENCES users(id)");
      } catch {}
    }

    // create alert_settings table if missing
    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(50) NOT NULL,
        max_temp FLOAT,
        min_temp FLOAT,
        max_humidity FLOAT,
        min_humidity FLOAT,
        min_soil INT,
        max_soil INT,
        offline_minutes INT DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device_user (user_id, device_id),
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      )
    `);

    // Create user_config table if missing
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          max_lands INT DEFAULT 5,
          max_sensors_per_land INT DEFAULT 10,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (err) {
      // Table might exist
    }

    // Create lands table if missing
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS lands (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(255),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          total_sensors INT DEFAULT 0,
          active_sensors INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (err) {
      // Table might exist
    }

    // Add land_id column to devices if not exists
    try {
      const [landCols] = await db.query("SHOW COLUMNS FROM devices LIKE 'land_id'");
      if (landCols.length === 0) {
        await db.query("ALTER TABLE devices ADD COLUMN land_id INT DEFAULT NULL");
        await db.query("ALTER TABLE devices ADD FOREIGN KEY (land_id) REFERENCES lands(id)");
      }
    } catch (err) {
      // Column might exist
    }
  } catch (err) {
    console.error('Schema check error:', err.message);
  }
}

// kick off schema check but don't await (server start doesn't depend on it)
ensureSchema().catch(console.error);

// Initialize irrigation scheduler (global)
export const scheduler = new IrrigationScheduler();
scheduler.start();

// Remove broken irrigation-logs mount (optional endpoint)
console.log("🚜 Irrigation system ready - schedules, AI, power monitoring active");

app.use('/api/irrigation-logs', irrigationLogsRouter);

// JSON file path for storing sensor data
const DATA_FILE = path.join(process.cwd(), "backend", "sensor_data.json");

// Helper function to read JSON data file
function readSensorData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading sensor data file:", error);
  }
  return { devices: {} };
}

// Helper function to write JSON data file
function writeSensorData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing sensor data file:", error);
  }
}

/* ================= HEALTH ================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================= AUTH HELPERS ================= */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Admin middleware - checks if user has admin role
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

/* ================= AUTH ENDPOINTS ================= */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
      username,
      hash,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Username already taken" });
    }
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ error: "Database not initialized; please run setup_database.sql or restart the server to auto-create schema." });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user role (default to 'user' if not set)
    const userRole = user.role || 'user';
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: userRole },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token, role: userRole });
  } catch (err) {
    console.error("Login error:", err);
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ error: "Database not initialized; please run setup_database.sql or restart the server to auto-create schema." });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ================= DEVICES ================= */
app.get("/api/devices", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM devices WHERE user_id = ? ORDER BY id",
      [req.user.id]
    );
    console.log(`/api/devices requested by user ${req.user.id}, returning ${rows.length} rows`);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Debug: return current authenticated user info
app.get("/api/me", authenticateToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// Debug: return raw device row (no ownership check) for quick verification
app.get("/api/device/:deviceId/raw", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM devices WHERE id = ?", [req.params.deviceId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error fetching device raw:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/devices", authenticateToken, async (req, res) => {
  const { name, latitude, longitude, location_name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Device name is required" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO devices (id, name, user_id, latitude, longitude, location_name, status)
       VALUES (?, ?, ?, ?, ?, ?, 'offline')`,
      [name, name, req.user.id, latitude || null, longitude || null, location_name || null]
    );

    res.json({ success: true, id: result.insertId, name });
  } catch (err) {
    console.error("Error adding device:", err);
    res.status(500).json({ error: "Failed to add device" });
  }
});


/* ================= DELETE DEVICE ================= */
app.delete("/api/devices/:deviceId", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    // Ensure the device belongs to the user and delete sensor data first
    await db.query(
      "DELETE sd FROM sensor_data sd JOIN devices d ON sd.device_id = d.id WHERE d.id = ? AND d.user_id = ?",
      [deviceId, req.user.id]
    );
    // Then delete the device itself
    const [result] = await db.query(
      "DELETE FROM devices WHERE id = ? AND user_id = ?",
      [deviceId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= UPDATE DEVICE GPS LOCATION ================= */
app.put("/api/devices/:deviceId/location", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  const {
    latitude,
    longitude,
    location_name,
    field_row,
    field_col,
    field_name
  } = req.body;

  // debug log so we can see what was submitted
  console.log(`PUT /api/devices/${deviceId}/location`, { latitude, longitude, location_name, name: req.body.name, userId: req.user.id });

  try {
    // Update fields: name, location_name can be NULL (user can delete them)
    // latitude/longitude/field_* use COALESCE to preserve if omitted
    const [result] = await db.query(
      `UPDATE devices SET name = COALESCE(?, name), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude), location_name = ?,
        field_row = COALESCE(?, field_row),
        field_col = COALESCE(?, field_col),
        field_name = COALESCE(?, field_name)
       WHERE id = ? AND user_id = ?`,
      [req.body.name || null, latitude ?? null, longitude ?? null, location_name ?? null, field_row, field_col, field_name, deviceId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



/* ================= GET GPS MAP DATA ================= */
app.get("/api/gps-map", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, status, latitude, longitude, location_name 
      FROM devices 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND user_id = ?
    `, [req.user.id]);
    // convert DECIMAL strings to numbers for client convenience
    const output = rows.map(r => ({
      ...r,
      latitude: r.latitude !== null ? parseFloat(r.latitude) : null,
      longitude: r.longitude !== null ? parseFloat(r.longitude) : null
    }));
    res.json(output);
  } catch (error) {
    // log the error so developers can inspect server console
    console.error("GET /api/gps-map error", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET ALL DEVICES LATEST DATA ================= */
app.get("/api/all-devices-data", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.name,
        d.status as device_status,
        d.latitude,
        d.longitude,
        d.location_name,
        sd.soil,
        sd.temperature,
        sd.humidity,
        sd.rssi,
        sd.created_at as last_update
      FROM devices d
      LEFT JOIN (
        SELECT device_id, soil, temperature, humidity, rssi, created_at
        FROM sensor_data
        WHERE (device_id, created_at) IN (
          SELECT device_id, MAX(created_at)
          FROM sensor_data
          GROUP BY device_id
        )
      ) sd ON d.id = sd.device_id
      WHERE d.user_id = ?
      ORDER BY d.id
    `, [req.user.id]);
    
    const deviceDataMap = {};
    rows.forEach(row => {
      const isOnline = row.device_status === 'online' && row.last_update;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const lastUpdateTime = row.last_update ? new Date(row.last_update) : null;
      
      deviceDataMap[row.id] = {
        id: row.id,
        name: row.name,
        status: (isOnline && lastUpdateTime && lastUpdateTime > fiveMinutesAgo) ? 'online' : 'offline',
        soil: row.soil,
        temperature: row.temperature,
        humidity: row.humidity,
        rssi: row.rssi,
        latitude: row.latitude,
        longitude: row.longitude,
        location_name: row.location_name,
        last_update: row.last_update
      };
    });
    
    res.json(deviceDataMap);
  } catch (error) {
    console.error("Error fetching all devices data:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= DEVICE HISTORY (time-series for Analytics charts) ================= */
app.get("/api/history/:deviceId", authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const range = req.query.range || "24h";
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    // Verify the device belongs to this user
    const [deviceCheck] = await db.query(
      "SELECT id FROM devices WHERE id = ? AND user_id = ?",
      [deviceId, req.user.id]
    );
    if (deviceCheck.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Map range to MySQL interval
    const rangeMap = {
      "1h":  "1 HOUR",
      "6h":  "6 HOUR",
      "24h": "24 HOUR",
      "7d":  "7 DAY",
      "30d": "30 DAY"
    };
    const interval = rangeMap[range] || "24 HOUR";

    const [rows] = await db.query(`
      SELECT soil, temperature, humidity, rssi, created_at
      FROM sensor_data
      WHERE device_id = ?
        AND created_at >= NOW() - INTERVAL ${interval}
      ORDER BY created_at ASC
      LIMIT ?
    `, [deviceId, limit]);

    res.json(rows);
  } catch (error) {
    console.error("GET /api/history/:deviceId error:", error);
    res.status(500).json({ error: error.message });
  }
});



/* ================= INSERT DATA (FROM LORA / POSTMAN) ================= */
app.post("/api/data", async (req, res) => {
  const { device_id, soil, temperature, humidity, rssi, battery, voltage, current } = req.body;

  const devId = device_id || "NODE_01";
  const soilVal = typeof soil === 'number' ? soil : parseInt(soil) || 0;
  const tempVal = typeof temperature === 'number' ? temperature : parseFloat(temperature) || 0;
  const humVal = typeof humidity === 'number' ? humidity : parseFloat(humidity) || 0;
  const rssiVal = typeof rssi === 'number' ? rssi : parseInt(rssi) || -100;
  const batteryVal = typeof battery === 'number' ? battery : parseFloat(battery) || null;
  const voltageVal = typeof voltage === 'number' ? voltage : parseFloat(voltage) || null;
  const currentVal = typeof current === 'number' ? current : parseFloat(current) || null;

  try {
    // Insert sensor data into database
    await db.query(
      `INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi, battery, voltage, current)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [devId, soilVal, tempVal, humVal, rssiVal, batteryVal, voltageVal, currentVal]
    );

    // Update power status
    let powerStatus = 'normal';
    if (voltageVal !== null && voltageVal < 180) powerStatus = 'outage';
    else if (voltageVal !== null && voltageVal < 200) powerStatus = 'low';
    await db.query(
      `UPDATE devices SET status='online', last_seen=NOW(), voltage=?, current=?, power_status=? WHERE id=?`,
      [voltageVal, currentVal, powerStatus, devId]
    );

    // Update device status to online  
    await db.query(
      `UPDATE devices SET status='online', last_seen=NOW() WHERE id=?`,
      [devId]
    );

    // ALSO save to JSON file for backup/alternative access
    const jsonData = readSensorData();
    if (!jsonData.devices) { jsonData.devices = {}; }
    if (!jsonData.devices[devId]) { jsonData.devices[devId] = { readings: [] }; }

    const newReading = {
      soil: soilVal,
      temperature: tempVal,
      humidity: humVal,
      rssi: rssiVal,
      created_at: new Date().toISOString()
    };

    // Keep last 100 readings in JSON - newest at top
    jsonData.devices[devId].readings.unshift(newReading);
    if (jsonData.devices[devId].readings.length > 100) {
      jsonData.devices[devId].readings = jsonData.devices[devId].readings.slice(0, 100);
    }

    writeSensorData(jsonData);

    res.json({ success: true, device_id: devId });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= FETCH LATEST (PER DEVICE) ================= */
app.get("/api/data/:deviceId", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT sd.soil, sd.temperature, sd.humidity, sd.rssi, sd.created_at
       FROM sensor_data sd
       JOIN devices d ON sd.device_id = d.id
       WHERE sd.device_id = ? AND d.user_id = ?
       ORDER BY sd.created_at DESC
       LIMIT 1`,
      [deviceId, req.user.id]
    );

    if (rows.length === 0) {
      return res.json({ offline: true });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching device data:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= ALERTS ================= */

// Get all alert settings for user
app.get("/api/alerts", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM alert_settings WHERE user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save or update alert settings for a device
app.post("/api/alerts", authenticateToken, async (req, res) => {
  const { device_id, max_temp, min_temp, max_humidity, min_humidity, min_soil, max_soil, offline_minutes } = req.body;
  
  if (!device_id) {
    return res.status(400).json({ error: "device_id is required" });
  }

  try {
    // Check if device belongs to user
    const [devices] = await db.query(
      "SELECT id FROM devices WHERE id = ? AND user_id = ?",
      [device_id, req.user.id]
    );
    
    if (devices.length === 0) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }

    // Insert or update alert settings
    await db.query(
      `INSERT INTO alert_settings (user_id, device_id, max_temp, min_temp, max_humidity, min_humidity, min_soil, max_soil, offline_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         max_temp = VALUES(max_temp),
         min_temp = VALUES(min_temp),
         max_humidity = VALUES(max_humidity),
         min_humidity = VALUES(min_humidity),
         min_soil = VALUES(min_soil),
         max_soil = VALUES(max_soil),
         offline_minutes = VALUES(offline_minutes)`,
      [req.user.id, device_id, max_temp || null, min_temp || null, max_humidity || null, min_humidity || null, min_soil || null, max_soil || null, offline_minutes || 30]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving alert:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete alert settings for a device
app.delete("/api/alerts/:deviceId", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    await db.query(
      "DELETE FROM alert_settings WHERE device_id = ? AND user_id = ?",
      [deviceId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get active alerts for all user devices
app.get("/api/alerts/active", authenticateToken, async (req, res) => {
  try {
    // Get all devices with their latest data
    const [devices] = await db.query(
      `SELECT d.id, d.name, d.status, d.last_seen, d.latitude, d.longitude, d.location_name,
              sd.soil, sd.temperature, sd.humidity, sd.created_at as last_update
       FROM devices d
       LEFT JOIN (
         SELECT device_id, soil, temperature, humidity, created_at
         FROM sensor_data
         WHERE (device_id, created_at) IN (
           SELECT device_id, MAX(created_at) FROM sensor_data GROUP BY device_id
         )
       ) sd ON d.id = sd.device_id
       WHERE d.user_id = ?`,
      [req.user.id]
    );

    // Get alert settings
    const [alertSettings] = await db.query(
      "SELECT * FROM alert_settings WHERE user_id = ?",
      [req.user.id]
    );

    const alerts = [];
    const now = new Date();

    // Check each device against its thresholds
    devices.forEach(device => {
      const settings = alertSettings.find(s => s.device_id === device.id);
      if (!settings) return;

      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      const lastUpdate = device.last_update ? new Date(device.last_update) : null;

      // Check offline threshold
      if (settings.offline_minutes && lastSeen) {
        const minutesOffline = (now - lastSeen) / (1000 * 60);
        if (minutesOffline > settings.offline_minutes) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'offline',
            severity: 'warning',
            message: `Device offline for ${Math.round(minutesOffline)} minutes (threshold: ${settings.offline_minutes} min)`
          });
        }
      }

      // Check temperature thresholds
      if (device.temperature !== null) {
        if (settings.max_temp && device.temperature > settings.max_temp) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'temperature_high',
            severity: 'critical',
            message: `Temperature too high: ${device.temperature}°C (max: ${settings.max_temp}°C)`
          });
        }
        if (settings.min_temp && device.temperature < settings.min_temp) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'temperature_low',
            severity: 'warning',
            message: `Temperature too low: ${device.temperature}°C (min: ${settings.min_temp}°C)`
          });
        }
      }

      // Check humidity thresholds
      if (device.humidity !== null) {
        if (settings.max_humidity && device.humidity > settings.max_humidity) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'humidity_high',
            severity: 'warning',
            message: `Humidity too high: ${device.humidity}% (max: ${settings.max_humidity}%)`
          });
        }
        if (settings.min_humidity && device.humidity < settings.min_humidity) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'humidity_low',
            severity: 'warning',
            message: `Humidity too low: ${device.humidity}% (min: ${settings.min_humidity}%)`
          });
        }
      }

      // Check soil moisture thresholds (for watering alerts)
      if (device.soil !== null) {
        if (settings.min_soil && device.soil < settings.min_soil) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'soil_low',
            severity: 'info',
            message: `Soil moisture LOW - Time to water! (${device.soil} ADC, min: ${settings.min_soil})`
          });
        }
        if (settings.max_soil && device.soil > settings.max_soil) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            type: 'soil_high',
            severity: 'info',
            message: `Soil moisture HIGH - Stop watering! (${device.soil} ADC, max: ${settings.max_soil})`
          });
        }
      }
    });

    res.json(alerts);
  } catch (error) {
    console.error("Error fetching active alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= HISTORY (PER DEVICE) ================= */
app.get("/api/history/:deviceId", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const range = req.query.range || '24h'; // default to last 24 hours

  // Calculate time range
  let timeCondition = '';
  const now = new Date();
  
  switch(range) {
    case '1h':
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
      break;
    case '6h':
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 6 HOUR)';
      break;
    case '24h':
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
      break;
    case '7d':
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      break;
    case '30d':
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case 'all':
      timeCondition = ''; // No time filter
      break;
    default:
      timeCondition = 'AND sd.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
  }

  try {
    const [rows] = await db.query(
      `SELECT sd.soil, sd.temperature, sd.humidity, sd.rssi, sd.created_at
       FROM sensor_data sd
       JOIN devices d ON sd.device_id = d.id
       WHERE sd.device_id = ? AND d.user_id = ? ${timeCondition}
       ORDER BY sd.created_at DESC
       LIMIT ?`,
      [deviceId, req.user.id, limit]
    );

    res.json(rows.reverse());
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET JSON DATA (ALL DATA) ================= */
app.get("/api/json-data", authenticateToken, async (req, res) => {
  const data = readSensorData();
  try {
    const [rows] = await db.query("SELECT id FROM devices WHERE user_id = ?", [
      req.user.id,
    ]);
    const userIds = new Set(rows.map(r => r.id));
    const filtered = { devices: {} };
    for (const id of Object.keys(data.devices || {})) {
      if (userIds.has(id)) filtered.devices[id] = data.devices[id];
    }
    res.json(filtered);
  } catch (err) {
    console.error("Error filtering json-data:", err);
    res.json(data); // fallback
  }
});

/* ================= SCHEDULES CRUD ================= */
app.get("/api/schedules", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, d.name as device_name, d.type, l.name as land_name 
      FROM schedules s 
      LEFT JOIN devices d ON s.device_id = d.id
      LEFT JOIN lands l ON s.land_id = l.id
      WHERE d.user_id = ?
      ORDER BY s.next_run
    `, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/schedules", authenticateToken, async (req, res) => {
  const { device_id, land_id, type, start_time, duration_minutes, repeat_pattern } = req.body;
  
  if (!device_id || !type || !start_time || !duration_minutes) {
    return res.status(400).json({ error: "device_id, type, start_time, duration_minutes required" });
  }

  try {
    // Verify device belongs to user and is actuator
    const [devices] = await db.query(
      "SELECT id FROM devices WHERE id = ? AND user_id = ? AND type IN ('pump', 'light')",
      [device_id, req.user.id]
    );
    if (devices.length === 0) {
      return res.status(404).json({ error: "Valid pump/light device not found" });
    }

    const [result] = await db.query(
      `INSERT INTO schedules (land_id, device_id, type, start_time, duration_minutes, repeat_pattern, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [land_id || null, device_id, type, start_time, duration_minutes, repeat_pattern || 'daily']
    );

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/schedules/:id", authenticateToken, async (req, res) => {
  const scheduleId = req.params.id;
  const updates = req.body;

  try {
    // Verify schedule belongs to user's devices
    const [schedules] = await db.query(
      "SELECT s.id FROM schedules s JOIN devices d ON s.device_id = d.id WHERE s.id = ? AND d.user_id = ?",
      [scheduleId, req.user.id]
    );
    if (schedules.length === 0) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    const updateFields = [];
    const values = [];
    Object.keys(updates).forEach(key => {
      updateFields.push(`${key} = ?`);
      values.push(updates[key]);
    });
    values.push(scheduleId, req.user.id);

    await db.query(
      `UPDATE schedules SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = ? AND EXISTS (SELECT 1 FROM devices WHERE id = schedules.device_id AND user_id = ?)`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/schedules/now", authenticateToken, async (req, res) => {
  const { device_id, duration, land_id, sequence_id } = req.body;
  if (!device_id || !duration) return res.status(400).json({ error: 'device_id and duration required' });

  try {
    const [device] = await db.query("SELECT type FROM devices WHERE id = ? AND user_id = ? AND type IN ('pump', 'light')", [device_id, req.user.id]);
    if (!device.length) return res.status(404).json({ error: 'Actuator not found' });

    await scheduler.startIrrigationNow(device_id, parseInt(duration), 'manual_now', null, sequence_id);
    res.json({ success: true, message: `Started ${device_id} for ${duration}min NOW` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ai-status", authenticateToken, async (req, res) => {
  try {
    const [aiDecisions] = await db.query("SELECT * FROM ai_decisions ORDER BY created_at DESC LIMIT 10");
    const [outages] = await db.query("SELECT * FROM outage_alerts WHERE acknowledged = FALSE ORDER BY created_at DESC LIMIT 5");
    res.json({ ai_decisions: aiDecisions, outage_alerts: outages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/schedules/:id", authenticateToken, async (req, res) => {
  const scheduleId = req.params.id;
  
  try {
    await db.query(
      `DELETE s FROM schedules s 
       JOIN devices d ON s.device_id = d.id 
       WHERE s.id = ? AND d.user_id = ?`,
      [scheduleId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= DEVICE CONTROL ================= */
app.post("/api/control/:deviceId", authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  const { action } = req.body; // 'on' or 'off'

  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: "action must be 'on' or 'off'" });
  }

  try {
    // Verify device belongs to user and is actuator
    const [devices] = await db.query(
      "SELECT type FROM devices WHERE id = ? AND user_id = ? AND type IN ('pump', 'light')",
      [deviceId, req.user.id]
    );
    if (devices.length === 0) {
      return res.status(404).json({ error: "Actuator device not found" });
    }

    const status = action === 'on' ? 'running' : 'idle';
    await db.query(
      `UPDATE devices SET status = ? WHERE id = ?`,
      [status, deviceId]
    );

    // Log manual irrigation
    if (action === 'on' && devices[0].type === 'pump') {
      await db.query(
        `INSERT INTO irrigation_logs (device_id, action, reason) VALUES (?, 'start', 'manual')`,
        [deviceId]
      );
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error("Error controlling device:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= UPDATE DEVICE STATUS ================= */
app.post("/api/heartbeat/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    await db.query(
      `UPDATE devices SET status='online', last_seen=NOW() WHERE id=?`,
      [deviceId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADMIN ENDPOINTS ================= */

// Get all users (admin only)
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, role, created_at FROM users ORDER BY id"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only)
app.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
  }

  try {
    // Prevent changing own role
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const [result] = await db.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Delete user's devices and sensor data first
    await db.query("DELETE FROM sensor_data WHERE device_id IN (SELECT id FROM devices WHERE user_id = ?)", [id]);
    await db.query("DELETE FROM devices WHERE user_id = ?", [id]);
    await db.query("DELETE FROM alert_settings WHERE user_id = ?", [id]);
    
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all devices with user info (admin only)
app.get("/api/admin/devices", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, u.username as owner_name, u.id as owner_id
      FROM devices d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.id
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching all devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a device on behalf of any user (admin only)
app.post("/api/admin/devices", authenticateToken, requireAdmin, async (req, res) => {
  const { device_id, name, user_id, latitude, longitude, location_name } = req.body;

  if (!device_id || !name || !user_id) {
    return res.status(400).json({ error: "device_id, name, and user_id are required" });
  }

  try {
    // Verify the target user exists
    const [users] = await db.query("SELECT id FROM users WHERE id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.query(
      `INSERT INTO devices (id, name, user_id, latitude, longitude, location_name, status)
       VALUES (?, ?, ?, ?, ?, ?, 'offline')`,
      [device_id, name, user_id, latitude || null, longitude || null, location_name || null]
    );

    res.json({ success: true, id: device_id, name });
  } catch (err) {
    console.error("Error adding device (admin):", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A device with that ID already exists" });
    }
    res.status(500).json({ error: "Failed to add device" });
  }
});

// Delete any device (admin only)
app.delete("/api/admin/devices/:deviceId", authenticateToken, requireAdmin, async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    // Delete sensor data first
    await db.query("DELETE FROM sensor_data WHERE device_id = ?", [deviceId]);
    await db.query("DELETE FROM alert_settings WHERE device_id = ?", [deviceId]);
    
    const [result] = await db.query("DELETE FROM devices WHERE id = ?", [deviceId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all alerts across all users (admin only)
app.get("/api/admin/alerts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all devices from all users with their latest data
    const [devices] = await db.query(`
      SELECT d.id, d.name, d.status, d.last_seen, d.user_id, u.username as owner_name,
             sd.soil, sd.temperature, sd.humidity, sd.created_at as last_update
      FROM devices d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN (
        SELECT device_id, soil, temperature, humidity, created_at
        FROM sensor_data
        WHERE (device_id, created_at) IN (
          SELECT device_id, MAX(created_at) FROM sensor_data GROUP BY device_id
        )
      ) sd ON d.id = sd.device_id
    `);

    // Get all alert settings
    const [alertSettings] = await db.query("SELECT * FROM alert_settings");

    const alerts = [];
    const now = new Date();

    // Check each device against its thresholds
    devices.forEach(device => {
      const settings = alertSettings.find(s => s.device_id === device.id);
      if (!settings) return;

      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      const lastUpdate = device.last_update ? new Date(device.last_update) : null;

      // Check offline threshold
      if (settings.offline_minutes && lastSeen) {
        const minutesOffline = (now - lastSeen) / (1000 * 60);
        if (minutesOffline > settings.offline_minutes) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'offline',
            severity: 'warning',
            message: `Device offline for ${Math.round(minutesOffline)} minutes (threshold: ${settings.offline_minutes} min)`
          });
        }
      }

      // Check temperature thresholds
      if (device.temperature !== null) {
        if (settings.max_temp && device.temperature > settings.max_temp) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'temperature_high',
            severity: 'critical',
            message: `Temperature too high: ${device.temperature}°C (max: ${settings.max_temp}°C)`
          });
        }
        if (settings.min_temp && device.temperature < settings.min_temp) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'temperature_low',
            severity: 'warning',
            message: `Temperature too low: ${device.temperature}°C (min: ${settings.min_temp}°C)`
          });
        }
      }

      // Check humidity thresholds
      if (device.humidity !== null) {
        if (settings.max_humidity && device.humidity > settings.max_humidity) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'humidity_high',
            severity: 'warning',
            message: `Humidity too high: ${device.humidity}% (max: ${settings.max_humidity}%)`
          });
        }
        if (settings.min_humidity && device.humidity < settings.min_humidity) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'humidity_low',
            severity: 'warning',
            message: `Humidity too low: ${device.humidity}% (min: ${settings.min_humidity}%)`
          });
        }
      }

      // Check soil moisture thresholds
      if (device.soil !== null) {
        if (settings.min_soil && device.soil < settings.min_soil) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'soil_low',
            severity: 'info',
            message: `Soil moisture LOW - Time to water! (${device.soil} ADC, min: ${settings.min_soil})`
          });
        }
        if (settings.max_soil && device.soil > settings.max_soil) {
          alerts.push({
            device_id: device.id,
            device_name: device.name,
            owner_id: device.user_id,
            owner_name: device.owner_name,
            type: 'soil_high',
            severity: 'info',
            message: `Soil moisture HIGH - Stop watering! (${device.soil} ADC, max: ${settings.max_soil})`
          });
        }
      }
    });

    res.json(alerts);
  } catch (error) {
    console.error("Error fetching all alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin dashboard stats
app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [userCount] = await db.query("SELECT COUNT(*) as count FROM users");
    const [deviceCount] = await db.query("SELECT COUNT(*) as count FROM devices");
    const [onlineDeviceCount] = await db.query("SELECT COUNT(*) as count FROM devices WHERE status = 'online'");
    const [offlineDeviceCount] = await db.query("SELECT COUNT(*) as count FROM devices WHERE status = 'offline'");
    const [totalReadings] = await db.query("SELECT COUNT(*) as count FROM sensor_data");
    const [recentReadings] = await db.query("SELECT COUNT(*) as count FROM sensor_data WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    const [todayReadings] = await db.query("SELECT COUNT(*) as count FROM sensor_data WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    const [alertCount] = await db.query("SELECT COUNT(*) as count FROM alert_settings");
    
    res.json({
      totalUsers: userCount[0].count,
      totalDevices: deviceCount[0].count,
      onlineDevices: onlineDeviceCount[0].count,
      offlineDevices: offlineDeviceCount[0].count,
      totalReadings: totalReadings[0].count,
      recentReadings: recentReadings[0].count,
      todayReadings: todayReadings[0].count,
      alertsTriggered: alertCount[0].count
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin dashboard chart data
app.get("/api/admin/stats/chart", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const range = req.query.range || '24h';
    let timeCondition = '';
    
    switch(range) {
      case '1h': timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'; break;
      case '6h': timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 6 HOUR)'; break;
      case '24h': timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'; break;
      case '7d': timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'; break;
      default: timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }

    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
        AVG(temperature) as avg_temp,
        AVG(humidity) as avg_humidity,
        COUNT(*) as readings
      FROM sensor_data
      WHERE (temperature IS NOT NULL OR humidity IS NOT NULL)
      ${timeCondition}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H')
      ORDER BY hour ASC
      LIMIT 50
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users with their config (admin only)
app.get("/api/admin/users-config", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.created_at,
        uc.max_lands,
        uc.max_sensors_per_land,
        (SELECT COUNT(*) FROM lands WHERE user_id = u.id) as current_lands,
        (SELECT COUNT(*) FROM devices WHERE user_id = u.id) as current_sensors
      FROM users u
      LEFT JOIN user_config uc ON u.id = uc.user_id
      ORDER BY u.id
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users config:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific user config (admin only)
app.get("/api/admin/users/:id/config", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id, 
        u.username,
        uc.max_lands,
        uc.max_sensors_per_land,
        (SELECT COUNT(*) FROM lands WHERE user_id = u.id) as current_lands,
        (SELECT COUNT(*) FROM devices WHERE user_id = u.id) as current_sensors
      FROM users u
      LEFT JOIN user_config uc ON u.id = uc.user_id
      WHERE u.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching user config:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user config (admin only)
app.put("/api/admin/users/:id/config", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { max_lands, max_sensors_per_land } = req.body;
  
  if (max_lands !== undefined && (isNaN(max_lands) || max_lands < 1)) {
    return res.status(400).json({ error: "max_lands must be a positive number" });
  }
  if (max_sensors_per_land !== undefined && (isNaN(max_sensors_per_land) || max_sensors_per_land < 1)) {
    return res.status(400).json({ error: "max_sensors_per_land must be a positive number" });
  }

  try {
    // Check if user exists
    const [users] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Insert or update user config
    await db.query(`
      INSERT INTO user_config (user_id, max_lands, max_sensors_per_land)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        max_lands = VALUES(max_lands),
        max_sensors_per_land = VALUES(max_sensors_per_land)
    `, [id, max_lands || 5, max_sensors_per_land || 10]);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user config:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= REPORTS API ================= */

// Get daily summary report - aggregated data for each device
app.get("/api/reports/daily-summary", authenticateToken, async (req, res) => {
  const { date } = req.query; // Format: YYYY-MM-DD, defaults to today
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  const startOfDay = `${targetDate} 00:00:00`;
  const endOfDay = `${targetDate} 23:59:59`;

  try {
    const [rows] = await db.query(`
      SELECT 
        d.id as device_id,
        d.name as device_name,
        d.location_name,
        COUNT(sd.id) as reading_count,
        AVG(sd.soil) as avg_soil,
        MIN(sd.soil) as min_soil,
        MAX(sd.soil) as max_soil,
        AVG(sd.temperature) as avg_temperature,
        MIN(sd.temperature) as min_temperature,
        MAX(sd.temperature) as max_temperature,
        AVG(sd.humidity) as avg_humidity,
        MIN(sd.humidity) as min_humidity,
        MAX(sd.humidity) as max_humidity,
        AVG(sd.rssi) as avg_rssi,
        MAX(sd.battery) as max_battery
      FROM devices d
      LEFT JOIN sensor_data sd ON d.id = sd.device_id 
        AND sd.created_at BETWEEN ? AND ?
      WHERE d.user_id = ?
      GROUP BY d.id, d.name, d.location_name
      ORDER BY d.name
    `, [startOfDay, endOfDay, req.user.id]);

    // Parse decimal values
    const results = rows.map(row => ({
      device_id: row.device_id,
      device_name: row.device_name,
      location_name: row.location_name,
      reading_count: row.reading_count,
      avg_soil: row.avg_soil ? parseFloat(row.avg_soil.toFixed(2)) : null,
      min_soil: row.min_soil,
      max_soil: row.max_soil,
      avg_temperature: row.avg_temperature ? parseFloat(row.avg_temperature.toFixed(2)) : null,
      min_temperature: row.min_temperature,
      max_temperature: row.max_temperature,
      avg_humidity: row.avg_humidity ? parseFloat(row.avg_humidity.toFixed(2)) : null,
      min_humidity: row.min_humidity,
      max_humidity: row.max_humidity,
      avg_rssi: row.avg_rssi ? parseFloat(row.avg_rssi.toFixed(2)) : null,
      max_battery: row.max_battery
    }));

    res.json({ date: targetDate, devices: results });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get weekly sensor data - hourly aggregated data for the week
app.get("/api/reports/weekly-data", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const startStr = start.toISOString().split('T')[0] + ' 00:00:00';
  const endStr = end.toISOString().split('T')[0] + ' 23:59:59';

  try {
    const [rows] = await db.query(`
      SELECT 
        d.id as device_id,
        d.name as device_name,
        DATE(sd.created_at) as date,
        HOUR(sd.created_at) as hour,
        COUNT(sd.id) as reading_count,
        AVG(sd.soil) as avg_soil,
        AVG(sd.temperature) as avg_temperature,
        AVG(sd.humidity) as avg_humidity,
        AVG(sd.rssi) as avg_rssi
      FROM devices d
      LEFT JOIN sensor_data sd ON d.id = sd.device_id 
        AND sd.created_at BETWEEN ? AND ?
      WHERE d.user_id = ?
      GROUP BY d.id, d.name, DATE(sd.created_at), HOUR(sd.created_at)
      ORDER BY d.name, date, hour
    `, [startStr, endStr, req.user.id]);

    // Group by device
    const deviceMap = {};
    rows.forEach(row => {
      if (!deviceMap[row.device_id]) {
        deviceMap[row.device_id] = {
          device_id: row.device_id,
          device_name: row.device_name,
          readings: []
        };
      }
      if (row.date) {
        deviceMap[row.device_id].readings.push({
          date: row.date,
          hour: row.hour,
          reading_count: row.reading_count,
          avg_soil: row.avg_soil ? parseFloat(row.avg_soil.toFixed(2)) : null,
          avg_temperature: row.avg_temperature ? parseFloat(row.avg_temperature.toFixed(2)) : null,
          avg_humidity: row.avg_humidity ? parseFloat(row.avg_humidity.toFixed(2)) : null,
          avg_rssi: row.avg_rssi ? parseFloat(row.avg_rssi.toFixed(2)) : null
        });
      }
    });

    res.json({ 
      startDate: start.toISOString().split('T')[0], 
      endDate: end.toISOString().split('T')[0],
      devices: Object.values(deviceMap) 
    });
  } catch (error) {
    console.error("Error fetching weekly data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get alert history report
app.get("/api/reports/alerts-history", authenticateToken, async (req, res) => {
  const { startDate, endDate, deviceId, limit } = req.query;
  
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const maxLimit = Math.min(parseInt(limit) || 100, 1000);

  const startStr = start.toISOString().split('T')[0] + ' 00:00:00';
  const endStr = end.toISOString().split('T')[0] + ' 23:59:59';

  try {
    // Get all devices with their latest data within the date range
    const [devices] = await db.query(`
      SELECT d.id as device_id, d.name as device_name, d.user_id,
             sd.soil, sd.temperature, sd.humidity, sd.created_at as data_timestamp
      FROM devices d
      LEFT JOIN sensor_data sd ON d.id = sd.device_id 
        AND sd.created_at BETWEEN ? AND ?
      WHERE d.user_id = ?
      ${deviceId ? 'AND d.id = ?' : ''}
      ORDER BY sd.created_at DESC
      LIMIT ?
    `, deviceId ? [startStr, endStr, req.user.id, deviceId, maxLimit] : [startStr, endStr, req.user.id, maxLimit]);

    // Get alert settings
    const [alertSettings] = await db.query(
      "SELECT * FROM alert_settings WHERE user_id = ?",
      [req.user.id]
    );

    const alerts = [];
    const now = new Date();

    // Check each device data point against thresholds
    devices.forEach(device => {
      if (!device.data_timestamp) return;
      
      const settings = alertSettings.find(s => s.device_id === device.id);
      if (!settings) return;

      const dataTime = new Date(device.data_timestamp);

      // Check temperature thresholds
      if (device.temperature !== null) {
        if (settings.max_temp && device.temperature > settings.max_temp) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'temperature_high',
            severity: 'critical',
            value: device.temperature,
            threshold: settings.max_temp,
            unit: '°C',
            message: `Temperature too high: ${device.temperature}°C (max: ${settings.max_temp}°C)`,
            timestamp: device.data_timestamp
          });
        }
        if (settings.min_temp && device.temperature < settings.min_temp) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'temperature_low',
            severity: 'warning',
            value: device.temperature,
            threshold: settings.min_temp,
            unit: '°C',
            message: `Temperature too low: ${device.temperature}°C (min: ${settings.min_temp}°C)`,
            timestamp: device.data_timestamp
          });
        }
      }

      // Check humidity thresholds
      if (device.humidity !== null) {
        if (settings.max_humidity && device.humidity > settings.max_humidity) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'humidity_high',
            severity: 'warning',
            value: device.humidity,
            threshold: settings.max_humidity,
            unit: '%',
            message: `Humidity too high: ${device.humidity}% (max: ${settings.max_humidity}%)`,
            timestamp: device.data_timestamp
          });
        }
        if (settings.min_humidity && device.humidity < settings.min_humidity) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'humidity_low',
            severity: 'warning',
            value: device.humidity,
            threshold: settings.min_humidity,
            unit: '%',
            message: `Humidity too low: ${device.humidity}% (min: ${settings.min_humidity}%)`,
            timestamp: device.data_timestamp
          });
        }
      }

      // Check soil moisture thresholds
      if (device.soil !== null) {
        if (settings.min_soil && device.soil < settings.min_soil) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'soil_low',
            severity: 'info',
            value: device.soil,
            threshold: settings.min_soil,
            unit: 'ADC',
            message: `Soil moisture LOW (${device.soil} ADC, min: ${settings.min_soil})`,
            timestamp: device.data_timestamp
          });
        }
        if (settings.max_soil && device.soil > settings.max_soil) {
          alerts.push({
            id: alerts.length + 1,
            device_id: device.id,
            device_name: device.device_name,
            type: 'soil_high',
            severity: 'info',
            value: device.soil,
            threshold: settings.max_soil,
            unit: 'ADC',
            message: `Soil moisture HIGH (${device.soil} ADC, max: ${settings.max_soil})`,
            timestamp: device.data_timestamp
          });
        }
      }
    });

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ 
      startDate: start.toISOString().split('T')[0], 
      endDate: end.toISOString().split('T')[0],
      totalAlerts: alerts.length,
      alerts: alerts.slice(0, maxLimit)
    });
  } catch (error) {
    console.error("Error fetching alerts history:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= START ================= */
app.listen(5000, () => {
  console.log("✅ Backend running on http://localhost:5000");
  console.log("📡 Endpoints:");
  console.log("   GET  /health              - Health check");
  console.log("   POST /api/register        - Create a new user account");
  console.log("   POST /api/login           - Login and receive JWT");
  console.log("   GET  /api/devices         - List all devices (requires auth)");
  console.log("   GET  /api/all-devices-data - Get all device latest data (auth)");
  console.log("   GET  /api/data/:deviceId  - Get latest data for device (auth)");
  console.log("   GET  /api/history/:deviceId - Get device history (auth)");
  console.log("   GET  /api/gps-map         - Get devices with GPS (auth)");
  console.log("   GET  /api/json-data       - Get all data in JSON format (auth)");
  console.log("   POST /api/data            - Submit sensor data (public)");
  console.log("   PUT  /api/devices/:id/location - Update GPS location (auth)");
  console.log("   POST /api/heartbeat/:deviceId - Device heartbeat (public)");
  console.log("   --- Reports Endpoints ---");
  console.log("   GET  /api/reports/daily-summary - Get daily summary report (auth)");
  console.log("   GET  /api/reports/weekly-data   - Get weekly sensor data (auth)");
  console.log("   GET  /api/reports/alerts-history - Get alerts history (auth)");
  console.log("   --- Admin Endpoints ---");
  console.log("   GET  /api/admin/users     - List all users (admin)");
  console.log("   PUT  /api/admin/users/:id/role - Change user role (admin)");
  console.log("   DELETE /api/admin/users/:id - Delete user (admin)");
  console.log("   GET  /api/admin/devices   - List all devices (admin)");
  console.log("   DELETE /api/admin/devices/:id - Delete any device (admin)");
  console.log("   GET  /api/admin/alerts    - Get all alerts (admin)");
  console.log("   GET  /api/admin/stats     - Get dashboard stats (admin)");
});
