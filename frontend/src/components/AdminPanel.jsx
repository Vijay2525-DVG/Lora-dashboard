import { useState, useEffect } from "react";

export default function AdminPanel({ onClose, token, apiFetch }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [userConfigs, setUserConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm, setConfigForm] = useState({ max_lands: 5, max_sensors_per_land: 10 });
  const [savingConfig, setSavingConfig] = useState(false);
  const [sensorData, setSensorData] = useState({});
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [chartData, setChartData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === "sensors") {
      fetchSensorData();
      const interval = setInterval(fetchSensorData, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "sensors" && selectedDevices.length > 0) fetchChartData();
  }, [activeTab, selectedDevices, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, devicesRes, alertsRes, configRes] = await Promise.all([
        apiFetch("http://localhost:5000/api/admin/stats"),
        apiFetch("http://localhost:5000/api/admin/users"),
        apiFetch("http://localhost:5000/api/admin/devices"),
        apiFetch("http://localhost:5000/api/admin/alerts"),
        apiFetch("http://localhost:5000/api/admin/users-config")
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (devicesRes.ok) {
        const devs = await devicesRes.json();
        setDevices(devs);
        if (devs.length > 0 && selectedDevices.length === 0) setSelectedDevices([devs[0].id]);
      }
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (configRes.ok) setUserConfigs(await configRes.json());
    } catch (err) { setError("Failed to load admin data"); }
    setLoading(false);
  };

  const fetchSensorData = async () => {
    setRefreshing(true);
    try {
      const response = await apiFetch("http://localhost:5000/api/admin/devices");
      if (response.ok) {
        const devs = await response.json();
        setDevices(devs);
        const dataMap = {};
        for (const dev of devs) {
          try {
            const dataRes = await apiFetch(`http://localhost:5000/api/data/${dev.id}`);
            if (dataRes.ok) dataMap[dev.id] = await dataRes.json();
          } catch (e) { dataMap[dev.id] = { offline: true }; }
        }
        setSensorData(dataMap);
      }
    } catch (err) { console.error("Error fetching sensor data:", err); }
    setRefreshing(false);
  };

  const fetchChartData = async () => {
    try {
      const promises = selectedDevices.map(async (deviceId) => {
        const response = await apiFetch(`http://localhost:5000/api/history/${deviceId}?range=${timeRange}&limit=100`);
        if (response.ok) {
          const data = await response.json();
          const device = devices.find(d => d.id === deviceId);
          return { deviceId, deviceName: device?.name || deviceId, data };
        }
        return null;
      });
      const results = await Promise.all(promises);
      setChartData(results.filter(r => r !== null));
    } catch (err) { console.error("Error fetching chart data:", err); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      else alert("Failed to update role");
    } catch (err) { alert("Error updating role"); }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}`, { method: "DELETE" });
      if (response.ok) setUsers(users.filter(u => u.id !== userId));
    } catch (err) { alert("Error deleting user"); }
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!confirm(`Delete device "${deviceName}"?`)) return;
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/devices/${deviceId}`, { method: "DELETE" });
      if (response.ok) setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) { alert("Error deleting device"); }
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config.id);
    setConfigForm({ max_lands: config.max_lands || 5, max_sensors_per_land: config.max_sensors_per_land || 10 });
  };

  const handleSaveConfig = async (userId) => {
    setSavingConfig(true);
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}/config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });
      if (response.ok) {
        setUserConfigs(userConfigs.map(u => u.id === userId ? { ...u, ...configForm } : u));
        setEditingConfig(null);
      }
    } catch (err) { alert("Error saving config"); }
    setSavingConfig(false);
  };

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]);
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={`admin-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>Users ({users.length})</button>
        <button className={`admin-tab ${activeTab === "devices" ? "active" : ""}`} onClick={() => setActiveTab("devices")}>Devices ({devices.length})</button>
        <button className={`admin-tab ${activeTab === "config" ? "active" : ""}`} onClick={() => setActiveTab("config")}>User Config</button>
        <button className={`admin-tab ${activeTab === "sensors" ? "active" : ""}`} onClick={() => setActiveTab("sensors")}>Sensors</button>
        <button className={`admin-tab ${activeTab === "alerts" ? "active" : ""}`} onClick={() => setActiveTab("alerts")}>Alerts ({alerts.length})</button>
        <button className={`admin-tab ${activeTab === "irrigation" ? "active" : ""}`} onClick={() => setActiveTab("irrigation")}>Irrigation</button>
      </div>
      <div className="admin-content">
        {error && <div className="admin-error">{error}</div>}

        {activeTab === "overview" && stats && (
          <div className="admin-overview">
            <div className="admin-stat-cards">
              <div className="admin-stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
              <div className="admin-stat-card"><div className="stat-value">{stats.totalDevices}</div><div className="stat-label">Total Devices</div></div>
              <div className="admin-stat-card online"><div className="stat-value">{stats.onlineDevices}</div><div className="stat-label">Online</div></div>
              <div className="admin-stat-card"><div className="stat-value">{stats.totalReadings?.toLocaleString() || 0}</div><div className="stat-label">Total Readings</div></div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-users">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <select value={user.role || 'user'} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="role-select">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td><button className="delete-btn" onClick={() => handleDeleteUser(user.id, user.username)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "devices" && (
          <div className="admin-devices">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Owner</th><th>Status</th><th>Location</th><th>Last Seen</th><th>Actions</th></tr></thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id}>
                    <td>{device.id}</td>
                    <td>{device.name}</td>
                    <td>{device.owner_name}</td>
                    <td><span className={`status-badge ${device.status}`}>{device.status}</span></td>
                    <td>{device.location_name || "-"}</td>
                    <td>{device.last_seen ? new Date(device.last_seen).toLocaleString() : "Never"}</td>
                    <td><button className="delete-btn" onClick={() => handleDeleteDevice(device.id, device.name)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "config" && (
          <div className="admin-config">
            <div className="config-info"><p>Configure max lands and sensors per land for each user.</p></div>
            <table className="admin-table">
              <thead><tr><th>User</th><th>Current Lands</th><th>Current Sensors</th><th>Max Lands</th><th>Max Sensors/Land</th><th>Actions</th></tr></thead>
              <tbody>
                {userConfigs.map(config => (
                  <tr key={config.id}>
                    <td>{config.username}</td>
                    <td>{config.current_lands || 0}</td>
                    <td>{config.current_sensors || 0}</td>
                    <td>
                      {editingConfig === config.id ? (
                        <input type="number" min="1" value={configForm.max_lands} onChange={(e) => setConfigForm({...configForm, max_lands: parseInt(e.target.value)})} className="config-input" />
                      ) : (config.max_lands || 5)}
                    </td>
                    <td>
                      {editingConfig === config.id ? (
                        <input type="number" min="1" value={configForm.max_sensors_per_land} onChange={(e) => setConfigForm({...configForm, max_sensors_per_land: parseInt(e.target.value)})} className="config-input" />
                      ) : (config.max_sensors_per_land || 10)}
                    </td>
                    <td>
                      {editingConfig === config.id ? (
                        <div className="config-actions">
                          <button className="save-btn" onClick={() => handleSaveConfig(config.id)} disabled={savingConfig}>{savingConfig ? "Saving..." : "Save"}</button>
                          <button className="cancel-btn" onClick={() => setEditingConfig(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEditConfig(config)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "sensors" && (
          <div className="admin-sensors">
            <div className="sensor-header">
              <h3>Sensor Monitoring</h3>
              <div className="sensor-controls">
                <button className="refresh-btn" onClick={fetchSensorData} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh"}</button>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="time-select">
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
              </div>
            </div>
            <div className="device-selector">
              <h4>Select Devices to Compare:</h4>
              <div className="device-checkboxes">
                {devices.map(device => (
                  <label key={device.id} className="device-checkbox">
                    <input type="checkbox" checked={selectedDevices.includes(device.id)} onChange={() => toggleDeviceSelection(device.id)} />
                    {device.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="live-readings">
              <h4>Live Sensor Readings</h4>
              <div className="sensor-cards">
                {devices.map(device => {
                  const data = sensorData[device.id] || {};
                  return (
                    <div key={device.id} className={`sensor-card ${data.offline ? 'offline' : 'online'}`}>
                      <div className="sensor-card-header">
                        <span className="sensor-name">{device.name}</span>
                        <span className={`sensor-status ${device.status}`}>{device.status}</span>
                      </div>
                      <div className="sensor-readings">
                        <div className="reading"><span className="label">Temp</span><span className="value">{data.temperature?.toFixed(1) || "--"}°C</span></div>
                        <div className="reading"><span className="label">Humidity</span><span className="value">{data.humidity?.toFixed(1) || "--"}%</span></div>
                        <div className="reading"><span className="label">Soil</span><span className="value">{data.soil ?? "--"}</span></div>
                        <div className="reading"><span className="label">RSSI</span><span className="value">{data.rssi ?? "--"} dBm</span></div>
                        <div className="reading"><span className="label">Battery</span><span className="value">{data.battery ? `${data.battery}%` : "--"}</span></div>
                      </div>
                      <div className="sensor-last-update">Last update: {data.created_at ? new Date(data.created_at).toLocaleTimeString() : "Never"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {chartData.length > 0 && (
              <div className="historical-charts">
                <h4>Historical Data - {timeRange}</h4>
                {chartData.map(chart => (
                  <div key={chart.deviceId} className="chart-container">
                    <h5>{chart.deviceName}</h5>
                    {chart.data.length > 0 ? (
                      <div className="chart-data">
                        <div className="chart-stats">
                          <div className="chart-stat"><span className="label">Avg Temp:</span><span className="value">{(chart.data.reduce((a, b) => a + (b.temperature || 0), 0) / chart.data.length).toFixed(1)}°C</span></div>
                          <div className="chart-stat"><span className="label">Avg Humidity:</span><span className="value">{(chart.data.reduce((a, b) => a + (b.humidity || 0), 0) / chart.data.length).toFixed(1)}%</span></div>
                          <div className="chart-stat"><span className="label">Min Temp:</span><span className="value">{Math.min(...chart.data.map(d => d.temperature || 0)).toFixed(1)}°C</span></div>
                          <div className="chart-stat"><span className="label">Max Temp:</span><span className="value">{Math.max(...chart.data.map(d => d.temperature || 0)).toFixed(1)}°C</span></div>
                        </div>
                      </div>
                    ) : <p>No historical data</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

{activeTab === "alerts" && (
          <div className="admin-alerts">
            {alerts.length === 0 ? <div className="no-alerts">No active alerts</div> : (
              <table className="admin-table">
                <thead><tr><th>Device</th><th>Owner</th><th>Type</th><th>Severity</th><th>Message</th></tr></thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx} className={`alert-row ${alert.severity}`}>
                      <td>{alert.device_name}</td>
                      <td>{alert.owner_name}</td>
                      <td>{alert.type}</td>
                      <td><span className={`severity-badge ${alert.severity}`}>{alert.severity}</span></td>
                      <td>{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === "irrigation" && (
          <div className="admin-irrigation">
<IrrigationScheduler token={token} apiFetch={apiFetch} />
          </div>
        )}
      </div>
    </div>
  );
}

