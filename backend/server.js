import express from "express";
import cors from "cors";
import { db } from "./db.js";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

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

/* ================= DEVICES ================= */
app.get("/api/devices", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM devices ORDER BY id");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= UPDATE DEVICE GPS LOCATION ================= */
app.put("/api/devices/:deviceId/location", async (req, res) => {
  const { deviceId } = req.params;
  const { latitude, longitude, location_name } = req.body;

  try {
    await db.query(
      `UPDATE devices SET latitude = ?, longitude = ?, location_name = ? WHERE id = ?`,
      [latitude, longitude, location_name, deviceId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET GPS MAP DATA ================= */
app.get("/api/gps-map", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, status, latitude, longitude, location_name 
      FROM devices 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET ALL DEVICES LATEST DATA ================= */
app.get("/api/all-devices-data", async (req, res) => {
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
      ORDER BY d.id
    `);
    
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

/* ================= INSERT DATA (FROM LORA / POSTMAN) ================= */
app.post("/api/data", async (req, res) => {
  const { device_id, soil, temperature, humidity, rssi } = req.body;

  const devId = device_id || "NODE_01";
  const soilVal = typeof soil === 'number' ? soil : parseInt(soil) || 0;
  const tempVal = typeof temperature === 'number' ? temperature : parseFloat(temperature) || 0;
  const humVal = typeof humidity === 'number' ? humidity : parseFloat(humidity) || 0;
  const rssiVal = typeof rssi === 'number' ? rssi : parseInt(rssi) || -100;

  try {
    // Insert sensor data into database
    await db.query(
      `INSERT INTO sensor_data (device_id, soil, temperature, humidity, rssi)
       VALUES (?, ?, ?, ?, ?)`,
      [devId, soilVal, tempVal, humVal, rssiVal]
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
app.get("/api/data/:deviceId", async (req, res) => {
  const { deviceId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT soil, temperature, humidity, rssi, created_at
       FROM sensor_data
       WHERE device_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [deviceId]
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

/* ================= HISTORY (PER DEVICE) ================= */
app.get("/api/history/:deviceId", async (req, res) => {
  const { deviceId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT soil, temperature, humidity, rssi, created_at
       FROM sensor_data
       WHERE device_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [deviceId]
    );

    res.json(rows.reverse());
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET JSON DATA (ALL DATA) ================= */
app.get("/api/json-data", (req, res) => {
  const data = readSensorData();
  res.json(data);
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

/* ================= START ================= */
app.listen(5000, () => {
  console.log("✅ Backend running on http://localhost:5000");
  console.log("📡 Endpoints:");
  console.log("   GET  /health              - Health check");
  console.log("   GET  /api/devices         - List all devices");
  console.log("   GET  /api/all-devices-data - Get all device latest data");
  console.log("   GET  /api/data/:deviceId  - Get latest data for device");
  console.log("   GET  /api/history/:deviceId - Get device history");
  console.log("   GET  /api/gps-map         - Get devices with GPS");
  console.log("   GET  /api/json-data       - Get all data in JSON format");
  console.log("   POST /api/data            - Submit sensor data");
  console.log("   PUT  /api/devices/:id/location - Update GPS location");
  console.log("   POST /api/heartbeat/:deviceId - Device heartbeat");
});
