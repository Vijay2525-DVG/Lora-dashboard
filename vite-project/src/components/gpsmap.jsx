import { useState, useEffect, useRef } from "react";

export default function GPSMap({ devices, onDeviceClick, selectedDevice }) {
  const [deviceLocations, setDeviceLocations] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({ latitude: "", longitude: "", location_name: "" });
  const canvasRef = useRef(null);

  // Load device locations from API
  useEffect(() => {
    fetch("http://localhost:5000/api/gps-map")
      .then(r => r.json())
      .then(data => {
        const locs = {};
        data.forEach(d => {
          locs[d.id] = {
            latitude: d.latitude,
            longitude: d.longitude,
            location_name: d.location_name,
            status: d.status
          };
        });
        setDeviceLocations(locs);
      })
      .catch(console.error);
  }, []);

  // Generate demo positions if no GPS data
  useEffect(() => {
    if (devices.length > 0 && Object.keys(deviceLocations).length === 0) {
      const baseLat = 13.0823;
      const baseLng = 80.2707;
      const newLocs = {};
      
      devices.forEach((device, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        newLocs[device.id] = {
          latitude: baseLat + (row * 0.0005),
          longitude: baseLng + (col * 0.0005),
          location_name: `Location ${index + 1}`,
          status: device.status || 'offline'
        };
      });
      
      setDeviceLocations(newLocs);
    }
  }, [devices]);

  // Draw map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Calculate bounds for positioning
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    Object.values(deviceLocations).forEach(loc => {
      if (loc.latitude && loc.longitude) {
        minLat = Math.min(minLat, loc.latitude);
        maxLat = Math.max(maxLat, loc.latitude);
        minLng = Math.min(minLng, loc.longitude);
        maxLng = Math.max(maxLng, loc.longitude);
      }
    });
    
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    
    // Draw device markers
    Object.entries(deviceLocations).forEach(([deviceId, loc]) => {
      if (!loc.latitude || !loc.longitude) return;
      
      const x = ((loc.longitude - minLng) / lngRange) * (width - 80) + 40;
      const y = height - ((loc.latitude - minLat) / latRange) * (height - 80) - 40;
      
      const isSelected = selectedDevice === deviceId;
      const isOnline = loc.status === 'online';
      
      // Draw marker circle
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 18 : 14, 0, Math.PI * 2);
      ctx.fillStyle = isOnline ? '#22c55e' : '#ef4444';
      ctx.fill();
      
      // Draw glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Draw inner circle
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  }, [deviceLocations, selectedDevice]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on existing marker
    let minDist = Infinity;
    let closestDevice = null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    Object.values(deviceLocations).forEach(loc => {
      if (loc.latitude && loc.longitude) {
        minLat = Math.min(minLat, loc.latitude);
        maxLat = Math.max(maxLat, loc.latitude);
        minLng = Math.min(minLng, loc.longitude);
        maxLng = Math.max(maxLng, loc.longitude);
      }
    });
    
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const width = canvas.width;
    const height = canvas.height;
    
    Object.entries(deviceLocations).forEach(([deviceId, loc]) => {
      if (!loc.latitude || !loc.longitude) return;
      
      const mx = ((loc.longitude - minLng) / lngRange) * (width - 80) + 40;
      const my = height - ((loc.latitude - minLat) / latRange) * (height - 80) - 40;
      
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 20 && dist < minDist) {
        minDist = dist;
        closestDevice = deviceId;
      }
    });
    
    if (closestDevice) {
      onDeviceClick(closestDevice);
    }
  };

  const handleEditClick = (deviceId) => {
    const loc = deviceLocations[deviceId] || {};
    setFormData({
      latitude: loc.latitude?.toString() || "",
      longitude: loc.longitude?.toString() || "",
      location_name: loc.location_name || ""
    });
    setEditingDevice(deviceId);
  };

  const handleSave = () => {
    if (!editingDevice) return;
    
    fetch(`http://localhost:5000/api/devices/${editingDevice}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        location_name: formData.location_name
      })
    }).then(() => {
      setDeviceLocations(prev => ({
        ...prev,
        [editingDevice]: {
          ...prev[editingDevice],
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          location_name: formData.location_name
        }
      }));
      setEditingDevice(null);
    });
  };

  return (
    <div className="gps-map-container">
      <div className="gps-map-header">
        <h3>📍 GPS Sensor Map</h3>
        <div className="gps-legend">
          <span className="legend-item"><span className="dot online"></span> Online</span>
          <span className="legend-item"><span className="dot offline"></span> Offline</span>
        </div>
      </div>

      <div className="gps-content">
        <div className="map-section">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="gps-canvas"
            onClick={handleCanvasClick}
          />
        </div>

        <div className="sensor-list-section">
          <h4>Sensor Locations</h4>
          <div className="sensor-list">
            {devices.map(device => {
              const loc = deviceLocations[device.id] || {};
              const isSelected = selectedDevice === device.id;
              
              return (
                <div
                  key={device.id}
                  className={`sensor-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onDeviceClick(device.id)}
                >
                  <div className="sensor-info">
                    <span className="sensor-name">{device.name || device.id}</span>
                    <span className="sensor-location">{loc.location_name || 'No location'}</span>
                  </div>
                  <div className="sensor-coords">
                    {loc.latitude && loc.longitude ? (
                      <>
                        <span>{loc.latitude.toFixed(4)}</span>
                        <span>{loc.longitude.toFixed(4)}</span>
                      </>
                    ) : (
                      <span className="no-gps">No GPS</span>
                    )}
                  </div>
                  <button 
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(device.id);
                    }}
                  >
                    ✏️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit GPS Location</h3>
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={e => setFormData({...formData, latitude: e.target.value})}
                placeholder="13.0823"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={e => setFormData({...formData, longitude: e.target.value})}
                placeholder="80.2707"
              />
            </div>
            <div className="form-group">
              <label>Location Name</label>
              <input
                type="text"
                value={formData.location_name}
                onChange={e => setFormData({...formData, location_name: e.target.value})}
                placeholder="Greenhouse 1"
              />
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleSave}>Save</button>
              <button className="cancel-btn" onClick={() => setEditingDevice(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
