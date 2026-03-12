import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { C, Icon } from "../App";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


// ── Inline Leaflet map picker used in the Add Device modal ──────────────────
function LocationPickerMap({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initLat = lat || 14.4324;
    const initLng = lng || 75.9566;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Place a draggable marker if initial coords provided
    if (lat && lng) {
      const m = L.marker([lat, lng], { draggable: true }).addTo(map);
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChange(p.lat, p.lng);
      });
      markerRef.current = m;
    }

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onChange(clickLat, clickLng);
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const m = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
        m.on('dragend', () => {
          const p = m.getLatLng();
          onChange(p.lat, p.lng);
        });
        markerRef.current = m;
      }
    });

    mapRef.current = map;
    // Force resize after render
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // only mount once

  // When parent passes lat/lng updates (e.g. from geolocation), move the map & marker
  useEffect(() => {
    if (!mapRef.current || lat === undefined || lng === undefined) return;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) return;
    mapRef.current.setView([numLat, numLng], 15);
    if (markerRef.current) {
      markerRef.current.setLatLng([numLat, numLng]);
    } else {
      const m = L.marker([numLat, numLng], { draggable: true }).addTo(mapRef.current);
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChange(p.lat, p.lng);
      });
      markerRef.current = m;
    }
  }, [lat, lng]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: 280, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${C.green}44` }} />
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: C.surface + "ee", backdropFilter: "blur(4px)", padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${C.green}`, color: C.green, fontSize: 12, fontWeight: 700, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 1000 }}>
        📍 Click or drag pin to set location
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

const Btn = ({ label, onClick, color = C.green, outline, icon, disabled, type = "button", style = {} }) => (
  <button type={type} onClick={onClick} disabled={disabled}
    style={{
      background: outline ? "transparent" : color + "22",
      color: disabled ? C.textSub : color,
      border: `1.5px solid ${disabled ? C.textSub : color}`,
      borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 0.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      transition: "all .15s", opacity: disabled ? 0.5 : 1,
      ...style
    }}>
    {icon && <Icon name={icon} size={16} color={disabled ? C.textSub : color} />}
    {label}
  </button>
);

const TableHeader = ({ children }) => (
  <th style={{ padding: "14px 18px", textAlign: "left", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${C.cardBorder}` }}>
    {children}
  </th>
);

const TableCell = ({ children, style = {} }) => (
  <td style={{ padding: "14px 18px", color: C.text, fontSize: 13, borderBottom: `1px solid ${C.cardBorder}55`, ...style }}>
    {children}
  </td>
);

export default function Admin({ token, apiFetch }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [userConfigs, setUserConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingDevice, setEditingDevice] = useState(null);
  const [editDeviceData, setEditDeviceData] = useState({ name: "", latitude: "", longitude: "", location_name: "" });
  const [savingDevice, setSavingDevice] = useState(false);

  const [addingDevice, setAddingDevice] = useState(false);
  const [addDeviceForm, setAddDeviceForm] = useState({ device_id: "", name: "", user_id: "", latitude: "", longitude: "", location_name: "" });
  const [savingNewDevice, setSavingNewDevice] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm, setConfigForm] = useState({ max_lands: 5, max_sensors_per_land: 10 });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
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
      if (devicesRes.ok) setDevices(await devicesRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (configRes.ok) setUserConfigs(await configRes.json());
    } catch (err) {
      setError("Failed to load admin data");
    }
    setLoading(false);
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config.id);
    setConfigForm({
      max_lands: config.max_lands || 5,
      max_sensors_per_land: config.max_sensors_per_land || 10
    });
  };

  const handleSaveConfig = async (userId) => {
    setSavingConfig(true);
    try {
      const response = await apiFetch(`http://localhost:5000/api/admin/users/${userId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });

      if (response.ok) {
        setUserConfigs(userConfigs.map(u =>
          u.id === userId ? { ...u, max_lands: configForm.max_lands, max_sensors_per_land: configForm.max_sensors_per_land } : u
        ));
        setEditingConfig(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save configuration");
      }
    } catch (err) {
      alert("Error saving configuration");
    }
    setSavingConfig(false);
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setConfigForm({ max_lands: 5, max_sensors_per_land: 10 });
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

  const handleEditDevice = (device) => {
    setEditingDevice(device);
    setEditDeviceData({
      name: device.name || "",
      latitude: device.latitude || "",
      longitude: device.longitude || "",
      location_name: device.location_name || ""
    });
  };

  const handleSaveDevice = async () => {
    if (!editingDevice) return;
    setSavingDevice(true);
    try {
      const response = await apiFetch(`http://localhost:5000/api/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDeviceData.name,
          latitude: editDeviceData.latitude ? parseFloat(editDeviceData.latitude) : null,
          longitude: editDeviceData.longitude ? parseFloat(editDeviceData.longitude) : null,
          location_name: editDeviceData.location_name || null
        })
      });

      if (response.ok) {
        setDevices(devices.map(d =>
          d.id === editingDevice.id
            ? { ...d, name: editDeviceData.name, latitude: editDeviceData.latitude ? parseFloat(editDeviceData.latitude) : null, longitude: editDeviceData.longitude ? parseFloat(editDeviceData.longitude) : null, location_name: editDeviceData.location_name }
            : d
        ));
        setEditingDevice(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update device");
      }
    } catch (err) {
      alert("Error updating device");
    }
    setSavingDevice(false);
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

  const handleAddDevice = async () => {
    const { device_id, name, user_id } = addDeviceForm;
    if (!device_id.trim() || !name.trim() || !user_id) {
      alert("Device ID, Name, and Owner are required.");
      return;
    }
    setSavingNewDevice(true);
    try {
      const response = await apiFetch("http://localhost:5000/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: addDeviceForm.device_id.trim(),
          name: addDeviceForm.name.trim(),
          user_id: parseInt(addDeviceForm.user_id),
          latitude: addDeviceForm.latitude ? parseFloat(addDeviceForm.latitude) : null,
          longitude: addDeviceForm.longitude ? parseFloat(addDeviceForm.longitude) : null,
          location_name: addDeviceForm.location_name || null
        })
      });
      if (response.ok) {
        // Refresh device list
        const devRes = await apiFetch("http://localhost:5000/api/admin/devices");
        if (devRes.ok) setDevices(await devRes.json());
        setAddingDevice(false);
        setAddDeviceForm({ device_id: "", name: "", user_id: "", latitude: "", longitude: "", location_name: "" });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add device");
      }
    } catch (err) {
      alert("Error adding device");
    }
    setSavingNewDevice(false);
  };

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: 40, display: "flex", alignItems: "center", justifyContent: "center", color: C.green, fontFamily: "monospace" }}>
        Loading Admin Resources...
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "users", label: `Users (${users.length})`, icon: "users" },
    { id: "userConfig", label: "User Configuration", icon: "settings" },
    { id: "devices", label: `Devices (${devices.length})`, icon: "sensors" },
    { id: "alerts", label: `Active Alerts (${alerts.length})`, icon: "alerts" }
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.cardBorder}`, padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.textSub, fontSize: 13, fontWeight: 700 }}>
            <Icon name="close" size={14} color={C.textSub} /> Back to Dashboard
          </button>
          <div style={{ width: 1, height: 24, background: C.cardBorder }} />
          <h2 style={{ color: C.text, margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "'Georgia', serif" }}>Platform Administration</h2>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar Tabs */}
        <div style={{ width: 260, borderRight: `1px solid ${C.cardBorder}`, padding: 20, background: C.surface + "aa", display: "flex", flexDirection: "column", gap: 6 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? C.green + "11" : "transparent",
                color: activeTab === t.id ? C.green : C.textMuted,
                border: "none", borderRadius: 8, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
                textAlign: "left", transition: "all .2s"
              }}>
              <Icon name={t.icon} size={16} color={activeTab === t.id ? C.green : C.textSub} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
          {error && <div style={{ background: C.red + "22", color: C.red, padding: 16, borderRadius: 8, marginBottom: 20, border: `1px solid ${C.red}55` }}>{error}</div>}

          {/* OVERVIEW */}
          {activeTab === "overview" && stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              {[
                { val: stats.totalUsers, label: "Total Users", color: C.blue },
                { val: stats.totalDevices, label: "Total Devices", color: C.amber },
                { val: stats.onlineDevices, label: "Online Devices", color: C.green },
                { val: stats.totalReadings.toLocaleString(), label: "Total Readings", color: "#a78bfa" },
                { val: stats.recentReadings.toLocaleString(), label: "Readings (Last Hour)", color: C.text },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ color: s.color, fontSize: 32, fontWeight: 800, fontFamily: "monospace" }}>{s.val}</span>
                  <span style={{ color: C.textSub, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <TableHeader>ID</TableHeader>
                    <TableHeader>Username</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ transition: "background .2s" }}>
                      <TableCell style={{ fontFamily: "monospace" }}>{user.id}</TableCell>
                      <TableCell style={{ fontWeight: 700, color: C.text }}>{user.username}</TableCell>
                      <TableCell>
                        <select value={user.role || 'user'} onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          style={{ background: C.surface, color: user.role === 'admin' ? C.amber : C.text, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none", cursor: "pointer" }}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </TableCell>
                      <TableCell style={{ color: C.textMuted }}>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Btn label="Delete" icon="close" outline color={C.red} style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleDeleteUser(user.id, user.username)} />
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* USER CONFIGURATION */}
          {activeTab === "userConfig" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: C.surface, borderLeft: `4px solid ${C.blue}`, padding: 16, borderRadius: "0 8px 8px 0", color: C.textMuted, fontSize: 13 }}>
                Configure capacity limits for each user. This sets their maximum allowed Farm Lands/Locations and maximum supported Sensors per Land.
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <TableHeader>User</TableHeader>
                      <TableHeader>Current Lands</TableHeader>
                      <TableHeader>Max Lands Limit</TableHeader>
                      <TableHeader>Current Sensors</TableHeader>
                      <TableHeader>Max Sensors/Land</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {userConfigs.map(config => (
                      <tr key={config.id}>
                        <TableCell>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontWeight: 700, color: C.text }}>{config.username}</span>
                            <span style={{ color: config.role === 'admin' ? C.amber : C.blue, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{config.role}</span>
                          </div>
                        </TableCell>
                        <TableCell style={{ fontFamily: "monospace", color: C.textSub }}>{config.current_lands || 0}</TableCell>
                        <TableCell>
                          {editingConfig === config.id ? (
                            <input type="number" min="1" value={configForm.max_lands} onChange={(e) => setConfigForm({ ...configForm, max_lands: parseInt(e.target.value) || 1 })}
                              style={{ width: 80, background: C.surface, border: `1px solid ${C.green}`, borderRadius: 6, padding: "6px", color: C.green, fontFamily: "monospace", outline: "none" }} />
                          ) : (
                            <span style={{ color: C.text, fontWeight: 700 }}>{config.max_lands || 5}</span>
                          )}
                        </TableCell>
                        <TableCell style={{ fontFamily: "monospace", color: C.textSub }}>{config.current_sensors || 0}</TableCell>
                        <TableCell>
                          {editingConfig === config.id ? (
                            <input type="number" min="1" value={configForm.max_sensors_per_land} onChange={(e) => setConfigForm({ ...configForm, max_sensors_per_land: parseInt(e.target.value) || 1 })}
                              style={{ width: 80, background: C.surface, border: `1px solid ${C.green}`, borderRadius: 6, padding: "6px", color: C.green, fontFamily: "monospace", outline: "none" }} />
                          ) : (
                            <span style={{ color: C.text, fontWeight: 700 }}>{config.max_sensors_per_land || 10}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingConfig === config.id ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <Btn label={savingConfig ? "..." : "Save"} color={C.green} style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleSaveConfig(config.id)} disabled={savingConfig} />
                              <Btn label="Cancel" outline color={C.textMuted} style={{ padding: "4px 10px", fontSize: 11 }} onClick={handleCancelEdit} />
                            </div>
                          ) : (
                            <Btn label="Edit Limits" icon="settings" outline color={C.blue} style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleEditConfig(config)} />
                          )}
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEVICES */}
          {activeTab === "devices" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn label="+ Add Device" color={C.green} icon="sensors" onClick={() => setAddingDevice(true)} />
              </div>
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <TableHeader>ID (MAC)</TableHeader>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Owner</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Coordinates (Lat/Lng)</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id}>
                      <TableCell style={{ fontFamily: "monospace", color: C.green }}>{device.id}</TableCell>
                      <TableCell style={{ fontWeight: 700 }}>{device.name || "Unnamed"}</TableCell>
                      <TableCell style={{ color: C.textMuted }}>{device.owner_name}</TableCell>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: device.status === 'online' ? C.green : C.red, boxShadow: device.status === 'online' ? `0 0 6px ${C.green}` : "none" }} />
                          <span style={{ color: device.status === 'online' ? C.text : C.textSub, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{device.status}</span>
                        </div>
                      </TableCell>
                      <TableCell style={{ color: C.textMuted }}>{device.location_name || "-"}</TableCell>
                      <TableCell style={{ fontFamily: "monospace", color: C.textSub, fontSize: 11 }}>
                        {device.latitude && device.longitude
                          ? `${parseFloat(device.latitude).toFixed(4)}, ${parseFloat(device.longitude).toFixed(4)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn label="Edit" outline color={C.textMuted} style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleEditDevice(device)} />
                          <Btn label="Delete" outline color={C.red} style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleDeleteDevice(device.id, device.name)} />
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* ALERTS */}
          {activeTab === "alerts" && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No active alerts system-wide.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <TableHeader>Device</TableHeader>
                      <TableHeader>Owner</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Severity</TableHeader>
                      <TableHeader>Message</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => {
                      const sevColor = alert.severity === "high" ? C.red : alert.severity === "medium" ? C.amber : C.blue;
                      return (
                        <tr key={idx}>
                          <TableCell style={{ fontFamily: "monospace", color: C.text }}>{alert.device_name}</TableCell>
                          <TableCell style={{ color: C.textMuted }}>{alert.owner_name}</TableCell>
                          <TableCell style={{ fontWeight: 700 }}>{alert.type}</TableCell>
                          <TableCell>
                            <span style={{ background: sevColor + "22", color: sevColor, border: `1px solid ${sevColor}55`, padding: "2px 6px", borderRadius: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800 }}>
                              {alert.severity}
                            </span>
                          </TableCell>
                          <TableCell style={{ color: C.textSub, maxWidth: 300 }}>{alert.message}</TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {addingDevice && (
        <div style={{ position: "fixed", inset: 0, background: "#000000dd", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setAddingDevice(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 800, color: C.text }}>Add New Device</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Device ID / MAC Address *</label>
                <input type="text" value={addDeviceForm.device_id} onChange={e => setAddDeviceForm({ ...addDeviceForm, device_id: e.target.value })} placeholder="e.g. NODE_01 or AA:BB:CC:DD:EE:FF"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Device Friendly Name *</label>
                <input type="text" value={addDeviceForm.name} onChange={e => setAddDeviceForm({ ...addDeviceForm, name: e.target.value })} placeholder="e.g. Pump Station 1"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Assign to User *</label>
                <select value={addDeviceForm.user_id} onChange={e => setAddDeviceForm({ ...addDeviceForm, user_id: e.target.value })}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: addDeviceForm.user_id ? C.text : C.textSub, fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="">-- Select a user --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Farm / Location Zone</label>
                <input type="text" value={addDeviceForm.location_name} onChange={e => setAddDeviceForm({ ...addDeviceForm, location_name: e.target.value })} placeholder="e.g. Greenhouse Alpha"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Latitude</label>
                  <input type="number" step="any" value={addDeviceForm.latitude} onChange={e => setAddDeviceForm({ ...addDeviceForm, latitude: e.target.value })} placeholder="13.0823"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Longitude</label>
                  <input type="number" step="any" value={addDeviceForm.longitude} onChange={e => setAddDeviceForm({ ...addDeviceForm, longitude: e.target.value })} placeholder="80.2707"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Map & location helper buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowMapPicker(v => !v)}
                  style={{ flex: 1, background: showMapPicker ? C.green + "22" : "transparent", color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  🗺️ {showMapPicker ? "Hide Map" : "Pick on Map"}
                </button>
                <button onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                      setAddDeviceForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
                    }, () => alert("Could not get your location."));
                  }
                }}
                  style={{ flex: 1, background: "transparent", color: C.amber, border: `1.5px solid ${C.amber}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  📡 Use My Location
                </button>
              </div>

              {/* Inline Leaflet map */}
              {showMapPicker && (
                <LocationPickerMap
                  lat={addDeviceForm.latitude ? parseFloat(addDeviceForm.latitude) : undefined}
                  lng={addDeviceForm.longitude ? parseFloat(addDeviceForm.longitude) : undefined}
                  onChange={(lat, lng) => setAddDeviceForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                />
              )}

              {addDeviceForm.latitude && addDeviceForm.longitude && (
                <div style={{ background: C.green + "11", border: `1px solid ${C.green}33`, borderRadius: 8, padding: "8px 14px", fontSize: 12, color: C.green, fontFamily: "monospace", textAlign: "center" }}>
                  📍 {parseFloat(addDeviceForm.latitude).toFixed(5)}, {parseFloat(addDeviceForm.longitude).toFixed(5)}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <Btn label="Cancel" outline color={C.textMuted} onClick={() => { setAddingDevice(false); setShowMapPicker(false); }} style={{ flex: 1 }} />
                <Btn label={savingNewDevice ? "Adding..." : "Add Device"} color={C.green} onClick={handleAddDevice} disabled={savingNewDevice} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Edit Device Modal */}
      {editingDevice && (
        <div style={{ position: "fixed", inset: 0, background: "#000000dd", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditingDevice(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, width: "100%", maxWidth: 500, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 800, color: C.text }}>Edit Global Device Config</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Device UID / MAC</label>
                <div style={{ color: C.green, fontFamily: "monospace", fontSize: 14, background: C.surface, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.cardBorder}` }}>{editingDevice.id}</div>
              </div>

              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Device Friendly Name</label>
                <input type="text" value={editDeviceData.name} onChange={e => setEditDeviceData({ ...editDeviceData, name: e.target.value })} placeholder="e.g. Pump Station 1"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Farm / Location Zone</label>
                <input type="text" value={editDeviceData.location_name} onChange={e => setEditDeviceData({ ...editDeviceData, location_name: e.target.value })} placeholder="e.g. Greenhouse Beta"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Latitude</label>
                  <input type="number" step="any" value={editDeviceData.latitude} onChange={e => setEditDeviceData({ ...editDeviceData, latitude: e.target.value })} placeholder="13.0823"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Longitude</label>
                  <input type="number" step="any" value={editDeviceData.longitude} onChange={e => setEditDeviceData({ ...editDeviceData, longitude: e.target.value })} placeholder="80.2707"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Btn label="Discard" outline color={C.textMuted} onClick={() => setEditingDevice(null)} style={{ flex: 1 }} />
                <Btn label={savingDevice ? "Updating..." : "Save Config"} color={C.green} onClick={handleSaveDevice} disabled={savingDevice} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
