
import { useState, useEffect } from "react";

export default function AlertPanel({ devices, onClose }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertSettings, setAlertSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false); // false = active alerts, 'list' = configured devices, 'edit' = configure form
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [configForm, setConfigForm] = useState({
    max_temp: 40,
    min_temp: 10,
    max_humidity: 90,
    min_humidity: 20,
    min_soil: 1500,
    max_soil: 3000,
    offline_minutes: 30
  });

  const token = localStorage.getItem("token");
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  // Fetch active alerts
  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/alerts/active", { headers });
      if (response.ok) {
        const data = await response.json();
        setActiveAlerts(data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing alert settings
  useEffect(() => {
    if (showConfig) {
      fetchAlertSettings();
    }
  }, [showConfig]);

  const fetchAlertSettings = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/alerts", { headers });
      if (response.ok) {
        const data = await response.json();
        const settingsMap = {};
        data.forEach(s => { settingsMap[s.device_id] = s; });
        setAlertSettings(settingsMap);
      }
    } catch (error) {
      console.error("Error fetching alert settings:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedDevice) return;
    
    try {
      const response = await fetch("http://localhost:5000/api/alerts", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: selectedDevice,
          ...configForm
        })
      });
      
      if (response.ok) {
        alert("Alert settings saved successfully!");
        fetchAlertSettings();
        fetchActiveAlerts();
        setShowConfig('list'); // Go back to list after saving
      }
    } catch (error) {
      console.error("Error saving alert settings:", error);
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedDevice) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${selectedDevice}`, {
        method: "DELETE",
        headers
      });
      
      if (response.ok) {
        alert("Alert settings deleted!");
        fetchAlertSettings();
        fetchActiveAlerts();
        setConfigForm({
          max_temp: 40,
          min_temp: 10,
          max_humidity: 90,
          min_humidity: 20,
          min_soil: 1500,
          max_soil: 3000,
          offline_minutes: 30
        });
        setSelectedDevice(null);
      }
    } catch (error) {
      console.error("Error deleting alert settings:", error);
    }
  };

  const loadDeviceConfig = (deviceId) => {
    setSelectedDevice(deviceId);
    const existing = alertSettings[deviceId];
    if (existing) {
      setConfigForm({
        max_temp: existing.max_temp || 40,
        min_temp: existing.min_temp || 10,
        max_humidity: existing.max_humidity || 90,
        min_humidity: existing.min_humidity || 20,
        min_soil: existing.min_soil || 1500,
        max_soil: existing.max_soil || 3000,
        offline_minutes: existing.offline_minutes || 30
      });
    } else {
      setConfigForm({
        max_temp: 40,
        min_temp: 10,
        max_humidity: 90,
        min_humidity: 20,
        min_soil: 1500,
        max_soil: 3000,
        offline_minutes: 30
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'soil_low': return '💧';
      case 'soil_high': return '🌊';
      case 'temperature_high': return '🌡️';
      case 'temperature_low': return '❄️';
      case 'humidity_high': return '💨';
      case 'humidity_low': return '🏜️';
      case 'offline': return '📡';
      default: return '⚠️';
    }
  };

  // Get list of devices that have alert configurations
  const configuredDevices = Object.keys(alertSettings);

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <h3>🔔 Alerts {activeAlerts.length > 0 && <span className="alert-badge">{activeAlerts.length}</span>}</h3>
        <button className="alert-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="alert-tabs">
        <button className={`alert-tab ${!showConfig ? 'active' : ''}`} onClick={() => setShowConfig(false)}>
          Active Alerts
        </button>
        <button className={`alert-tab ${showConfig === 'list' ? 'active' : ''}`} onClick={() => setShowConfig('list')}>
          My Devices ({configuredDevices.length})
        </button>
        <button className={`alert-tab ${showConfig === 'edit' ? 'active' : ''}`} onClick={() => setShowConfig('edit')}>
          Configure New
        </button>
      </div>

      {/* Active Alerts View */}
      {!showConfig && (
        <div className="alert-list">
          {loading ? (
            <div className="alert-loading">Loading alerts...</div>
          ) : activeAlerts.length === 0 ? (
            <div className="alert-empty">
              <span className="alert-empty-icon">✅</span>
              <p>No active alerts</p>
              <p className="alert-empty-sub">All sensors are working within normal parameters</p>
            </div>
          ) : (
            activeAlerts.map((alert, index) => (
              <div key={index} className="alert-item" style={{ borderLeftColor: getSeverityColor(alert.severity) }}>
                <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                <div className="alert-content">
                  <strong>{alert.device_name}</strong>
                  <p>{alert.message}</p>
                </div>
                <span className={`alert-severity ${alert.severity}`}>{alert.severity}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Configured Devices List */}
      {showConfig === 'list' && (
        <div className="configured-devices-list">
          {configuredDevices.length === 0 ? (
            <div className="alert-empty">
              <span className="alert-empty-icon">📝</span>
              <p>No devices configured yet</p>
              <p className="alert-empty-sub">Click "Configure New" to add alert settings</p>
              <button className="add-config-btn" onClick={() => setShowConfig('edit')}>
                + Configure a Device
              </button>
            </div>
          ) : (
            <>
              <p className="config-list-title">Devices with alert configurations:</p>
              {configuredDevices.map(deviceId => {
                const settings = alertSettings[deviceId];
                const device = devices.find(d => d.id === deviceId);
                return (
                  <div 
                    key={deviceId} 
                    className="configured-device-card"
                    onClick={() => { loadDeviceConfig(deviceId); setShowConfig('edit'); }}
                  >
                    <div className="configured-device-header">
                      <strong>{device?.name || deviceId}</strong>
                      <span className="edit-icon">✏️</span>
                    </div>
                    <div className="configured-device-values">
                      <span>🌡️ Temp: {settings.min_temp}°C - {settings.max_temp}°C</span>
                      <span>💨 Humidity: {settings.min_humidity}% - {settings.max_humidity}%</span>
                      <span>💧 Soil: {settings.min_soil} - {settings.max_soil}</span>
                      <span>📡 Offline: {settings.offline_minutes} min</span>
                    </div>
                  </div>
                );
              })}
              <button className="add-config-btn" onClick={() => setShowConfig('edit')}>
                + Configure Another Device
              </button>
            </>
          )}
        </div>
      )}

      {/* Configure/Edit Form */}
      {showConfig === 'edit' && (
        <div className="alert-config">
          <div className="config-device-select">
            <label>Select Device:</label>
            <select 
              value={selectedDevice || ''} 
              onChange={(e) => loadDeviceConfig(e.target.value)}
            >
              <option value="">-- Select a device --</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name || d.id}</option>
              ))}
            </select>
          </div>

          {selectedDevice && (
            <div className="config-form">
              <h4>
                Alert Thresholds for {devices.find(d => d.id === selectedDevice)?.name}
                {alertSettings[selectedDevice] && <span className="edit-badge"> (Updating)</span>}
              </h4>
              
              <div className="config-section">
                <h5>🌡️ Temperature (°C)</h5>
                <div className="config-row">
                  <label>Max Temperature:</label>
                  <input 
                    type="number" 
                    value={configForm.max_temp}
                    onChange={(e) => setConfigForm({...configForm, max_temp: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="config-row">
                  <label>Min Temperature:</label>
                  <input 
                    type="number" 
                    value={configForm.min_temp}
                    onChange={(e) => setConfigForm({...configForm, min_temp: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="config-section">
                <h5>💨 Humidity (%)</h5>
                <div className="config-row">
                  <label>Max Humidity:</label>
                  <input 
                    type="number" 
                    value={configForm.max_humidity}
                    onChange={(e) => setConfigForm({...configForm, max_humidity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="config-row">
                  <label>Min Humidity:</label>
                  <input 
                    type="number" 
                    value={configForm.min_humidity}
                    onChange={(e) => setConfigForm({...configForm, min_humidity: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="config-section">
                <h5>💧 Soil Moisture (ADC)</h5>
                <div className="config-row">
                  <label>Min Soil (Time to water):</label>
                  <input 
                    type="number" 
                    value={configForm.min_soil}
                    onChange={(e) => setConfigForm({...configForm, min_soil: parseInt(e.target.value)})}
                  />
                </div>
                <div className="config-row">
                  <label>Max Soil (Stop watering):</label>
                  <input 
                    type="number" 
                    value={configForm.max_soil}
                    onChange={(e) => setConfigForm({...configForm, max_soil: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="config-section">
                <h5>📡 Offline Alert</h5>
                <div className="config-row">
                  <label>Alert after (minutes):</label>
                  <input 
                    type="number" 
                    value={configForm.offline_minutes}
                    onChange={(e) => setConfigForm({...configForm, offline_minutes: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="config-actions">
                <button className="save-config-btn" onClick={handleSaveConfig}>
                  {alertSettings[selectedDevice] ? 'Update Settings' : 'Save Settings'}
                </button>
                {alertSettings[selectedDevice] && (
                  <button className="delete-config-btn" onClick={handleDeleteConfig}>Delete</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

