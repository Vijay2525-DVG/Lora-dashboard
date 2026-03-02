import { useEffect, useState } from "react";
import StatCard from "./components/statcard";
import SensorChart from "./components/sensorchart";
import DataTable from "./components/datatable";
import GPSMap from "./components/gpsmap";

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [allDeviceData, setAllDeviceData] = useState({});
  const [deviceHistory, setDeviceHistory] = useState({});
  const [demoMode, setDemoMode] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [viewMode, setViewMode] = useState("single");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceData, setNewDeviceData] = useState({ latitude: "", longitude: "", location_name: "" });
  const [addingDevice, setAddingDevice] = useState(false);

  console.log("App rendering - devices:", devices.length, "selectedDeviceId:", selectedDeviceId);
  console.log("App state - backendOnline:", backendOnline, "loading:", loading, "error:", error);

  /* Backend health check */
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("http://localhost:5000/health");
        setBackendOnline(r.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    // Force loading to false after 5 seconds to prevent infinite loading
    const timeout = setTimeout(() => setLoading(false), 5000);
    const i = setInterval(check, 3000);
    return () => {
      clearInterval(i);
      clearTimeout(timeout);
    };
  }, []);

  /* Load devices */
  useEffect(() => {
    if (!backendOnline) return;

    setLoading(true);
    fetch("http://localhost:5000/api/devices")
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch devices");
        return r.json();
      })
      .then(d => {
        console.log("Devices loaded:", d);
        setDevices(d);
        if (!selectedDeviceId && d.length > 0) {
          setSelectedDeviceId(d[0].id);
        }
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load devices:", err);
        setLoading(false);
        setError("Could not connect to backend. Make sure the server is running.");
      });
  }, [backendOnline]);

  /* Fetch ALL device data continuously */
  useEffect(() => {
    if (!backendOnline || demoMode || devices.length === 0) return;

    const intervalRef = { current: null };
    
    const fetchAllDeviceData = async () => {
      try {
        const r = await fetch("http://localhost:5000/api/all-devices-data");
        const data = await r.json();
        console.log("All device data fetched:", data);
        
        setAllDeviceData(data);
        
        Object.values(data).forEach(deviceData => {
          if (deviceData.status === 'online' && deviceData.soil !== undefined) {
            setDeviceHistory(prev => {
              const deviceHist = prev[deviceData.id] || [];
              const newEntry = {
                ...deviceData,
                time: new Date().toLocaleTimeString(),
                created_at: deviceData.last_update || new Date()
              };
              return {
                ...prev,
                [deviceData.id]: [newEntry, ...deviceHist.slice(0, 49)]
              };
            });
          }
        });
      } catch (err) {
        console.error("Failed to fetch all device data:", err);
        
        const deviceDataMap = {};
        const promises = devices.map(async (device) => {
          try {
            const r = await fetch(`http://localhost:5000/api/data/${device.id}`);
            const json = await r.json();
            return { deviceId: device.id, data: json, device };
          } catch (e) {
            return { deviceId: device.id, data: { offline: true }, device };
          }
        });
        
        const results = await Promise.all(promises);
        results.forEach(({ deviceId, data, device }) => {
          if (!data.offline) {
            const entry = {
              ...data,
              time: new Date().toLocaleTimeString(),
              deviceName: device.name || deviceId
            };
            deviceDataMap[deviceId] = entry;
            
            setDeviceHistory(prev => {
              const deviceHist = prev[deviceId] || [];
              return {
                ...prev,
                [deviceId]: [{ ...entry, created_at: new Date() }, ...deviceHist.slice(0, 49)]
              };
            });
          }
        });
        setAllDeviceData(prev => ({ ...prev, ...deviceDataMap }));
      }
    };

    fetchAllDeviceData();
    intervalRef.current = setInterval(fetchAllDeviceData, 3000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [backendOnline, demoMode, devices.length]);

  /* Demo Mode - Generate random data */
  useEffect(() => {
    if (!demoMode || devices.length === 0) return;

    const intervalRef = { current: null };
    
    const generateDemoData = () => {
      const baseConfigs = {
        "device_1": { soil: 1800, temp: 28, hum: 60, rssi: -85 },
        "device_2": { soil: 2200, temp: 32, hum: 45, rssi: -92 },
        "device_3": { soil: 1500, temp: 25, hum: 70, rssi: -78 },
      };

      const newData = {};
      
      devices.forEach((device, idx) => {
        const base = baseConfigs[device.id] || { 
          soil: 1500 + idx * 300, 
          temp: 25 + idx * 3, 
          hum: 50 + idx * 10, 
          rssi: -80 - idx * 5 
        };
        
        const newEntry = {
          soil: base.soil + Math.floor(Math.random() * 500) - 250,
          temperature: base.temp + Math.floor(Math.random() * 6) - 3,
          humidity: Math.max(0, Math.min(100, base.hum + Math.floor(Math.random() * 20) - 10)),
          rssi: base.rssi + Math.floor(Math.random() * 10) - 5,
          time: new Date().toLocaleTimeString(),
          deviceName: device.name || device.id,
          status: 'online'
        };
        
        newData[device.id] = newEntry;
        
        setDeviceHistory(prev => {
          const deviceHist = prev[device.id] || [];
          return {
            ...prev,
            [device.id]: [{ ...newEntry, created_at: new Date() }, ...deviceHist.slice(0, 49)]
          };
        });
      });

      setAllDeviceData(newData);
    };

    generateDemoData();
    intervalRef.current = setInterval(generateDemoData, 2000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [demoMode, devices.length]);

  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    console.log("Dropdown changed to:", newDeviceId);
    setSelectedDeviceId(newDeviceId);
  };

  const handleDeviceClick = (deviceId) => {
    console.log("Device clicked from GPS map:", deviceId);
    setSelectedDeviceId(deviceId);
  };

  const handleAddDevice = async () => {
    setAddingDevice(true);
    try {
      const response = await fetch("http://localhost:5000/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: newDeviceData.latitude ? parseFloat(newDeviceData.latitude) : null,
          longitude: newDeviceData.longitude ? parseFloat(newDeviceData.longitude) : null,
          location_name: newDeviceData.location_name || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Device added:", result);
        
        const devicesResponse = await fetch("http://localhost:5000/api/devices");
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
        
        setSelectedDeviceId(result.id);
        
        setShowAddDeviceModal(false);
        setNewDeviceData({ latitude: "", longitude: "", location_name: "" });
      }
    } catch (error) {
      console.error("Error adding device:", error);
    }
    setAddingDevice(false);
  };

  const getCardInfo = (title) => {
    const info = {
      "Soil": {
        description: "Soil moisture sensor reading (ADC value)",
        range: "0-4095 (12-bit ADC)",
        tips: "Lower values indicate wetter soil, higher values mean drier soil"
      },
      "Temp": {
        description: "Temperature reading from DHT sensor",
        range: "-40°C to 80°C",
        tips: "Optimal growth temperature for most plants: 18-24°C"
      },
      "Humidity": {
        description: "Relative humidity percentage",
        range: "0-100%",
        tips: "Optimal humidity for plants: 40-60%"
      },
      "RSSI": {
        description: "Received Signal Strength Indicator",
        range: "-30 to -120 dBm",
        tips: "Higher (closer to 0) is better. -50 dBm is excellent signal"
      }
    };
    return info[title] || {};
  };

  const currentData = allDeviceData[selectedDeviceId] || null;
  const history = deviceHistory[selectedDeviceId] || [];
  const [fullHistory, setFullHistory] = useState([]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    fetch(`http://localhost:5000/api/history/${selectedDeviceId}`)
      .then(r => r.json())
      .then(data => {
        // the server returns oldest first
        setFullHistory(data || []);
      })
      .catch(err => console.error('Failed to load full history', err));
  }, [selectedDeviceId]);
  const onlineDevices = Object.values(allDeviceData).filter(d => d.status === 'online').length;

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <h2>Loading Dashboard...</h2>
          <p>Connecting to backend on http://localhost:5000</p>
          <p style={{marginTop: "20px", fontSize: "12px", color: "#94a3b8"}}>Backend Online: {backendOnline ? "Yes" : "No"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <div className="error-steps">
            <p><strong>To fix this:</strong></p>
            <ol>
              <li>Make sure MySQL is running</li>
              <li>Start the backend: <code>cd backend && npm start</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button className="demo-btn" onClick={() => { setError(null); setDemoMode(true); }}>
            Try Demo Mode Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <div className="header-left">
          <h1>LoRa Soil Monitoring</h1>
          <div className="status-badges">
            <span className="device-count">{devices.length} Devices</span>
            <span className="online-count">{onlineDevices} Online</span>
          </div>
        </div>
        <div className="header-right">
          <button className="add-device-btn" onClick={() => setShowAddDeviceModal(true)}>
            Add Device
          </button>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === "single" ? "active" : ""}`} onClick={() => setViewMode("single")}>
              Single
            </button>
            <button className={`view-btn ${viewMode === "all" ? "active" : ""}`} onClick={() => setViewMode("all")}>
              All Devices
            </button>
          </div>
          <button className={`demo-btn ${demoMode ? "active" : ""}`} onClick={() => setDemoMode(!demoMode)}>
            {demoMode ? "Stop Demo" : "Start Demo"}
          </button>
          <button className={`demo-btn ${showMap ? "active" : ""}`} onClick={() => setShowMap(!showMap)}>
            {showMap ? "Hide Map" : "Show Map"}
          </button>
          <span className={backendOnline ? "online" : "offline"}>
            {backendOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </header>

      {showAddDeviceModal && (
        <div className="modal-overlay" onClick={() => setShowAddDeviceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={() => setShowAddDeviceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-info">
                A new device will be created: <strong>Device {devices.length + 1}</strong>
              </p>
              <div className="form-group">
                <label>Location Name (Optional)</label>
                <input type="text" placeholder="e.g., Garden, Farm" value={newDeviceData.location_name}
                  onChange={(e) => setNewDeviceData({...newDeviceData, location_name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="any" placeholder="13.0823" value={newDeviceData.latitude}
                    onChange={(e) => setNewDeviceData({...newDeviceData, latitude: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="any" placeholder="80.2707" value={newDeviceData.longitude}
                    onChange={(e) => setNewDeviceData({...newDeviceData, longitude: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddDeviceModal(false)}>Cancel</button>
              <button className="btn-add" onClick={handleAddDevice} disabled={addingDevice}>
                {addingDevice ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMap && <GPSMap devices={devices} onDeviceClick={handleDeviceClick} selectedDevice={selectedDeviceId} />}

      {backendOnline && devices.length > 0 && (
        <div className="device-selector">
          <label className="device-label">Active Device:</label>
          <select value={selectedDeviceId} onChange={handleDeviceChange}>
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.name || d.id} {allDeviceData[d.id]?.status === 'online' ? "🟢" : "🔴"}
              </option>
            ))}
          </select>
        </div>
      )}

      {viewMode === "all" && (
        <div className="all-devices-grid">
          {devices.map(device => {
            const data = allDeviceData[device.id];
            const isOnline = data?.status === 'online';
            return (
              <div key={device.id} className={`device-card ${selectedDeviceId === device.id ? 'selected' : ''}`}
                onClick={() => setSelectedDeviceId(device.id)}>
                <div className="device-card-header">
                  <h4>{device.name || device.id}</h4>
                  <span className={isOnline ? "online" : "offline"} style={{fontSize: '16px'}}>{isOnline ? "●" : "●"}</span>
                </div>
                {data && isOnline ? (
                  <div className="device-card-stats">
                    <div className="stat"><span className="label">Soil</span><span className="value">{data.soil}</span></div>
                    <div className="stat"><span className="label">Temp</span><span className="value">{data.temperature}°C</span></div>
                    <div className="stat"><span className="label">Hum</span><span className="value">{data.humidity}%</span></div>
                    <div className="stat"><span className="label">RSSI</span><span className="value">{data.rssi}</span></div>
                  </div>
                ) : (
                  <div className="no-data">No data received</div>
                )}
                <button className="view-device-btn" onClick={(e) => { e.stopPropagation(); setSelectedDeviceId(device.id); setViewMode("single"); }}>
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "single" && (
        <>
          <div className="grid">
            <StatCard title="Soil" value={currentData?.soil} unit="ADC" onClick={() => setSelectedCard(selectedCard === "Soil" ? null : "Soil")} isSelected={selectedCard === "Soil"} info={getCardInfo("Soil")} />
            <StatCard title="Temp" value={currentData?.temperature} unit="°C" onClick={() => setSelectedCard(selectedCard === "Temp" ? null : "Temp")} isSelected={selectedCard === "Temp"} info={getCardInfo("Temp")} />
            <StatCard title="Humidity" value={currentData?.humidity} unit="%" onClick={() => setSelectedCard(selectedCard === "Humidity" ? null : "Humidity")} isSelected={selectedCard === "Humidity"} info={getCardInfo("Humidity")} />
            <StatCard title="RSSI" value={currentData?.rssi} unit="dBm" onClick={() => setSelectedCard(selectedCard === "RSSI" ? null : "RSSI")} isSelected={selectedCard === "RSSI"} info={getCardInfo("RSSI")} />
          </div>

          {selectedCard && (
            <div className="card-info-panel">
              <h3>{selectedCard} Details</h3>
              <p><strong>Description:</strong> {getCardInfo(selectedCard).description}</p>
              <p><strong>Range:</strong> {getCardInfo(selectedCard).range}</p>
              <p><strong>Tip:</strong> {getCardInfo(selectedCard).tips}</p>
            </div>
          )}

          <div className="charts">
            <SensorChart title="Soil Moisture" data={history} dataKey="soil" color="#22c55e" unit="ADC" />
            <SensorChart title="Temperature" data={history} dataKey="temperature" color="#f97316" unit="°C" />
            <SensorChart title="Humidity" data={history} dataKey="humidity" color="#38bdf8" unit="%" />
          </div>

          {/* show full history if loaded, otherwise recent readings */}
          <DataTable data={fullHistory.length > 0 ? fullHistory : history} showFull={fullHistory.length > 0} />
        </>
      )}
    </div>
  );
}
