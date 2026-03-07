import { useState, useEffect } from "react";

export default function AdminPanel({ onClose, token, apiFetch }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, devicesRes, alertsRes] = await Promise.all([
        apiFetch("http://localhost:5000/api/admin/stats"),
        apiFetch("http://localhost:5000/api/admin/users"),
        apiFetch("http://localhost:5000/api/admin/devices"),
        apiFetch("http://localhost:5000/api/admin/alerts")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (devicesRes.ok) setDevices(await devicesRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch (err) {
      setError("Failed to load admin data");
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert("Failed to update role");
      }
    } catch (err) {
      alert("Error updating role");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This will also delete all their devices and data.`)) return;
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!confirm(`Are you sure you want to delete device "${deviceName}"? This will also delete all sensor data.`)) return;
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/devices/${deviceId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setDevices(devices.filter(d => d.id !== deviceId));
      } else {
        alert("Failed to delete device");
      }
    } catch (err) {
      alert("Error deleting device");
    }
  };

  if (loading) {
    return (
      <div className="admin-panell">
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-loading">Loading admin data...</div>
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
        <button 
          className={`admin-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.length})
        </button>
        <button 
          className={`admin-tab ${activeTab === "devices" ? "active" : ""}`}
          onClick={() => setActiveTab("devices")}
        >
          Devices ({devices.length})
        </button>
        <button 
          className={`admin-tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          Alerts ({alerts.length})
        </button>
      </div>

      <div className="admin-content">
        {error && <div className="admin-error">{error}</div>}

        {activeTab === "overview" && stats && (
          <div className="admin-overview">
            <div className="admin-stat-cards">
              <div className="admin-stat-card">
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-value">{stats.totalDevices}</div>
                <div className="stat-label">Total Devices</div>
              </div>
              <div className="admin-stat-card online">
                <div className="stat-value">{stats.onlineDevices}</div>
                <div className="stat-label">Online Devices</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-value">{stats.totalReadings.toLocaleString()}</div>
                <div className="stat-label">Total Readings</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-value">{stats.recentReadings.toLocaleString()}</div>
                <div className="stat-label">Readings (Last Hour)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-users">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <select 
                        value={user.role || 'user'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "devices" && (
          <div className="admin-devices">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id}>
                    <td>{device.id}</td>
                    <td>{device.name}</td>
                    <td>{device.owner_name}</td>
                    <td>
                      <span className={`status-badge ${device.status}`}>
                        {device.status}
                      </span>
                    </td>
                    <td>{device.location_name || "-"}</td>
                    <td>{device.last_seen ? new Date(device.last_seen).toLocaleString() : "Never"}</td>
                    <td>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteDevice(device.id, device.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="admin-alerts">
            {alerts.length === 0 ? (
              <div className="no-alerts">No active alerts</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Owner</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx} className={`alert-row ${alert.severity}`}>
                      <td>{alert.device_name}</td>
                      <td>{alert.owner_name}</td>
                      <td>{alert.type}</td>
                      <td>
                        <span className={`severity-badge ${alert.severity}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

