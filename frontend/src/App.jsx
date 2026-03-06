import { useEffect, useState } from "react";
import StatCard from "./components/statcard";
import SensorChart from "./components/sensorchart";
import DataTable from "./components/datatable";
import GPSMap from "./components/gpsmap";
import DeviceDetail from "./components/DeviceDetail";
import AlertPanel from "./components/AlertPanel";

export default function App() {
  // --- authentication state ---
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [usernameDisplay, setUsernameDisplay] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState(null);

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
  const [viewingDeviceDetail, setViewingDeviceDetail] = useState(false);
  const [addPickMode, setAddPickMode] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [newDeviceData, setNewDeviceData] = useState({ name: "", latitude: "", longitude: "", location_name: "" });
  const [addingDevice, setAddingDevice] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [alertLoading, setAlertLoading] = useState(true);

  console.log("App rendering - devices:", devices.length, "selectedDeviceId:", selectedDeviceId, "token exists?", !!token);
  console.log("App state - backendOnline:", backendOnline, "loading:", loading, "error:", error);

  /* decode token to show username */
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsernameDisplay(payload.username || "");
      } catch (e) {
        setUsernameDisplay("");
      }
    } else {
      setUsernameDisplay("");
    }
  }, [token]);

  /* helper that always attaches authorization header */
  const apiFetch = async (url, options = {}) => {
    const hdrs = { ...(options.headers || {}) };
    if (token) {
      hdrs["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { ...options, headers: hdrs });
    if ((resp.status === 401 || resp.status === 403) && token) {
      // token is invalid or expired, drop it and force re-login
      setToken("");
      localStorage.removeItem("token");
    }
    return resp;
  };

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
    // Check less frequently since data doesn't change quickly (every 30 seconds)
    const timeout = setTimeout(() => setLoading(false), 5000);
    const i = setInterval(check, 30000);
    return () => {
      clearInterval(i);
      clearTimeout(timeout);
    };
  }, []);

  /* Load devices */
  useEffect(() => {
    if (!backendOnline || !token) return;

    // Reset all device data when user changes
    setAllDeviceData({});
    setDeviceHistory({});
    setSelectedDeviceId("");
    
    setLoading(true);
    apiFetch("http://localhost:5000/api/devices")
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
  }, [backendOnline, token]);

  /* Fetch active alerts count */
  useEffect(() => {
    if (!backendOnline || !token) return;

    const fetchAlertCount = async () => {
      try {
        const response = await apiFetch("http://localhost:5000/api/alerts/active");
        if (response.ok) {
          const data = await response.json();
          setAlertCount(data.length);
        }
      } catch (error) {
        console.error("Error fetching alert count:", error);
      } finally {
        setAlertLoading(false);
      }
    };

    fetchAlertCount();
    const alertInterval = setInterval(fetchAlertCount, 30000); // Update every 30 seconds
    
    return () => clearInterval(alertInterval);
  }, [backendOnline, token]);

  /* Fetch ALL device data continuously */
  useEffect(() => {
    if (!backendOnline || demoMode || devices.length === 0 || !token) return;

    const intervalRef = { current: null };
    
    const fetchAllDeviceData = async () => {
      try {
        const r = await apiFetch("http://localhost:5000/api/all-devices-data");
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
            const r = await apiFetch(`http://localhost:5000/api/data/${device.id}`);
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
    intervalRef.current = setInterval(fetchAllDeviceData, 300000); // 5 minutes
    
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
      // Use user-provided name or generate a default
      const deviceName = newDeviceData.name || `Device_${Date.now()}`;
      const response = await apiFetch("http://localhost:5000/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deviceName,
          latitude: newDeviceData.latitude ? parseFloat(newDeviceData.latitude) : null,
          longitude: newDeviceData.longitude ? parseFloat(newDeviceData.longitude) : null,
          location_name: newDeviceData.location_name || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Device added:", result);
        
        const devicesResponse = await apiFetch("http://localhost:5000/api/devices");
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
        
        setSelectedDeviceId(result.id);
        
        // Refresh the map to show the new device's GPS location
        setMapRefreshKey(prev => prev + 1);
        
        setShowAddDeviceModal(false);
        setNewDeviceData({ name: "", latitude: "", longitude: "", location_name: "" });
        setAddPickMode(false);
      }
    } catch (error) {
      console.error("Error adding device:", error);
    }
    setAddingDevice(false);
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    // Confirm before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete "${deviceName || deviceId}"? This will also delete all sensor data for this device.`);
    if (!confirmDelete) return;
    
    console.log("Deleting device:", deviceId);
    
    try {
      const response = await apiFetch(`http://localhost:5000/api/devices/${deviceId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        console.log("Device deleted:", deviceId);
        
        // Refresh devices list
        const devicesResponse = await apiFetch("http://localhost:5000/api/devices");
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
        
        // If the deleted device was selected, select another one
        if (selectedDeviceId === deviceId) {
          setSelectedDeviceId(devicesData.length > 0 ? devicesData[0].id : "");
        }
        
        // Refresh the map
        setMapRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert("Failed to delete device: " + (error.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      alert("Error deleting device. Make sure you are the owner of this device.");
    }
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
  const [timeRange, setTimeRange] = useState('24h'); // Default to 24 hours

  useEffect(() => {
    if (!selectedDeviceId) return;
    apiFetch(`http://localhost:5000/api/history/${selectedDeviceId}?range=${timeRange}`)
      .then(r => r.json())
      .then(data => {
        // the server returns oldest first
        setFullHistory(data || []);
      })
      .catch(err => console.error('Failed to load full history', err));
  }, [selectedDeviceId, timeRange]);
  const onlineDevices = Object.values(allDeviceData).filter(d => d.status === 'online').length;

  // if user not logged in show auth form
  if (!token) {
    return (
      <div className="page">
        <div className="auth-container">
          <h2>{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p className="auth-subtitle">
            {authMode === "login" 
              ? "Sign in to access your LoRa sensors" 
              : "Register to start monitoring your sensors"}
          </p>
          
          {/* Toggle Buttons */}
          <div className="auth-buttons">
            <button 
              className={`auth-btn ${authMode === "login" ? "active" : ""}`}
              onClick={() => { setAuthMode("login"); setAuthError(null); }}
            >
              Sign In
            </button>
            <button 
              className={`auth-btn ${authMode === "register" ? "active" : ""}`}
              onClick={() => { setAuthMode("register"); setAuthError(null); }}
            >
              Register
            </button>
          </div>
          
          <form 
            className="auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError(null);
              const url = authMode === "login" ? "/api/login" : "/api/register";
              try {
                const r = await fetch("http://localhost:5000" + url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username: authUser,
                    password: authPass,
                  }),
                });
                const data = await r.json();
                if (!r.ok) {
                  throw new Error(data.error || "Authentication failed");
                }
                if (authMode === "login") {
                  setToken(data.token);
                  localStorage.setItem("token", data.token);
                } else {
                  // after registering, switch to login automatically
                  setAuthMode("login");
                  setAuthError("Registration successful, please login.");
                }
              } catch (err) {
                console.error("Auth error", err);
                setAuthError(err.message);
              }
            }}
          >
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={authUser}
              onChange={(e) => setAuthUser(e.target.value)}
              required
            />
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={authPass}
              onChange={(e) => setAuthPass(e.target.value)}
              required
            />
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          
          <div className="auth-switch">
            <p>
              {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError(null);
              }}>
                {authMode === "login" ? "Register" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      {viewingDeviceDetail && selectedDeviceId && (
        <DeviceDetail
          device={devices.find(d => d.id === selectedDeviceId) || {}}
          data={allDeviceData[selectedDeviceId]}
          history={deviceHistory[selectedDeviceId] || []}
          fullHistory={fullHistory}
          onBack={() => setViewingDeviceDetail(false)}
        />
      )}

      {!viewingDeviceDetail && (
        <>
      <header>
        <div className="header-left">
          <h1>LoRa Soil Monitoring</h1>
          {usernameDisplay && <div className="user-greeting">Hello, {usernameDisplay}</div>}
          <div className="status-badges">
            <span className="device-count">{devices.length} Devices</span>
            <span className="online-count">{onlineDevices} Online</span>
          </div>
        </div>
        <div className="header-right">
          {/* Alert Button */}
          <button className="alert-btn" onClick={async () => {
            // Refresh alert count before opening
            try {
              const response = await apiFetch("http://localhost:5000/api/alerts/active");
              if (response.ok) {
                const data = await response.json();
                setAlertCount(data.length);
              }
            } catch (error) {
              console.error("Error fetching alert count:", error);
            }
            setShowAlertPanel(true);
          }}>
            🔔 Alerts {!alertLoading && alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
          </button>
          {/* Time Range Selector */}
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
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
          {token && (
            <button
              className="demo-btn"
              onClick={() => {
                setToken("");
                localStorage.removeItem("token");
                // clear state so user must login again
                setDevices([]);
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {showAddDeviceModal && !addPickMode && (
        <div className="modal-overlay" onClick={() => { setShowAddDeviceModal(false); setAddPickMode(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={() => { setShowAddDeviceModal(false); setAddPickMode(false); }}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-info">
                A new device will be created: <strong>Device {devices.length + 1}</strong>
              </p>
              <div className="form-group">
                <label>Device Name *</label>
                <input type="text" placeholder="e.g., Device 1" value={newDeviceData.name}
                  onChange={(e) => setNewDeviceData({...newDeviceData, name: e.target.value})} required />
              </div>
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
              <div className="map-pick-controls">
                <button
                  className="pick-map-btn"
                  onClick={() => {
                    setAddPickMode(true);
                    setShowMap(true); // ensure map is visible when picking
                  }}
                >
                  📍 Pick on map
                </button>
                <button
                  className="use-location-btn"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(pos => {
                        setNewDeviceData(prev => ({
                          ...prev,
                          latitude: pos.coords.latitude.toString(),
                          longitude: pos.coords.longitude.toString()
                        }));
                      });
                    }
                  }}
                >
                  📡 Use my location
                </button>
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

      {showMap && (
        <GPSMap
          devices={devices}
          onDeviceClick={handleDeviceClick}
          selectedDevice={selectedDeviceId}
          addPickMode={addPickMode}
          refreshKey={mapRefreshKey}
          onNewLocationPick={(lat, lng) => {
            setNewDeviceData(prev => ({
              ...prev,
              latitude: lat.toString(),
              longitude: lng.toString()
            }));
            setAddPickMode(false);
          }}
          onDeviceNameClick={(deviceId) => {
            setSelectedDeviceId(deviceId);
            setViewingDeviceDetail(true);
          }}
          onDeleteDevice={handleDeleteDevice}
        />
      )}

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
                  <div className="device-header-actions">
                    <span className={isOnline ? "online" : "offline"} style={{fontSize: '16px'}}>{isOnline ? "●" : "●"}</span>
                    <button 
                      className="delete-device-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDevice(device.id, device.name || device.id);
                      }}
                      title="Delete device"
                    >
                      🗑️
                    </button>
                  </div>
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

          {/* Time Range Info */}
          <div className="time-range-info">
            <span>📊 Showing data for: <strong>{timeRange === '1h' ? 'Last 1 Hour' : timeRange === '6h' ? 'Last 6 Hours' : timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'All Time'}</strong></span>
            <span className="data-count">({fullHistory.length} readings)</span>
          </div>

          <div className="charts">
            <SensorChart title="Soil Moisture" data={history} dataKey="soil" color="#22c55e" unit="ADC" />
            <SensorChart title="Temperature" data={history} dataKey="temperature" color="#f97316" unit="°C" />
            <SensorChart title="Humidity" data={history} dataKey="humidity" color="#38bdf8" unit="%" />
          </div>

          {/* show full history if loaded, otherwise recent readings */}
          <DataTable data={fullHistory.length > 0 ? fullHistory : history} showFull={fullHistory.length > 0} />
        </>
      )}
      </>
      )}

      {/* Alert Panel Modal */}
      {showAlertPanel && (
        <div className="modal-overlay" onClick={() => setShowAlertPanel(false)}>
          <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
            <AlertPanel 
              devices={devices} 
              onClose={() => setShowAlertPanel(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
