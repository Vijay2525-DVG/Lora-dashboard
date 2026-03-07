import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function GPSMap({
  devices,
  onDeviceClick,
  selectedDevice,
  addPickMode = false,
  onNewLocationPick,
  onDeviceNameClick,
  refreshKey = 0,
  onDeleteDevice = null
}) {
  const [deviceLocations, setDeviceLocations] = useState({});
  const [nameMap, setNameMap] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({ latitude: "", longitude: "", location_name: "", name: "" });
  const [pickMode, setPickMode] = useState(false); // when true, next map click sets coordinates for existing device
  const [mapType, setMapType] = useState("satellite"); // satellite, streets, terrain, dark
  
  // Map tile layer options
  const mapLayers = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      name: 'Satellite'
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      name: 'Streets'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      name: 'Terrain'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      name: 'Dark'
    }
  };

  const validLocations = useMemo(() => {
    return Object.entries(deviceLocations)
      .filter(([, loc]) => loc.latitude && loc.longitude)
      .map(([id, loc]) => ({ id, ...loc }));
  }, [deviceLocations]);

  // Load device locations from API (include token if available)
  useEffect(() => {
    const headers = {};
    const t = localStorage.getItem("token");
    if (t) headers["Authorization"] = `Bearer ${t}`;

    fetch("http://localhost:5000/api/gps-map", { headers })
      .then(r => {
        if (!r.ok) {
          // try to read any JSON error message
          return r.json().then(err => {
            throw new Error(err.error || `HTTP ${r.status}`);
          });
        }
        return r.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          // unexpected response (e.g. {error:...}), bail out
          throw new Error("gps-map response was not an array");
        }
        const locs = {};
        data.forEach(d => {
          locs[d.id] = {
            latitude: d.latitude !== null ? parseFloat(d.latitude) : null,
            longitude: d.longitude !== null ? parseFloat(d.longitude) : null,
            location_name: d.location_name,
            status: d.status
          };
        });
        
        // If we got data from API, use it; otherwise fall back to devices prop
        if (data.length > 0) {
          setDeviceLocations(locs);
        } else {
          // Fall back to devices prop if API returned empty
          console.log("GPS API returned empty, using devices prop as fallback");
        }
      })
      .catch(err => {
        console.error("Unable to load gps-map data", err);
      });
  }, [refreshKey]);

  // Fallback: use devices prop coordinates when API returns nothing
  useEffect(() => {
    if (devices.length > 0) {
      console.log("Checking device coordinates from props:", devices);
      
      // Always merge devices prop coordinates as they may be newer
      const newLocs = {};
      devices.forEach(d => {
        if (d.latitude && d.longitude) {
          newLocs[d.id] = {
            latitude: parseFloat(d.latitude),
            longitude: parseFloat(d.longitude),
            location_name: d.location_name,
            status: d.status
          };
        }
      });
      
      // Merge with existing locations (devices prop takes precedence for coordinates)
      if (Object.keys(newLocs).length > 0) {
        setDeviceLocations(prev => {
          const merged = { ...prev };
          // Update with device prop coordinates if available
          Object.keys(newLocs).forEach(id => {
            if (newLocs[id].latitude && newLocs[id].longitude) {
              merged[id] = newLocs[id];
            }
          });
          return merged;
        });
      }
    }
  }, [devices, refreshKey]);

  // Generate demo positions if no GPS data
  useEffect(() => {
    if (devices.length > 0 && Object.keys(deviceLocations).length === 0) {
      const baseLat = 14.4324;
      const baseLng = 75.9566;
      const newLocs = {};
      
      devices.forEach((device, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        // preserve any stored configuration/location_name on the device record
        const cfg = device.location_name || device.config || null;
        newLocs[device.id] = {
          latitude: baseLat + (row * 0.0005),
          longitude: baseLng + (col * 0.0005),
          location_name: cfg || `Location ${index + 1}`,
          status: device.status || 'offline'
        };
      });
      
      setDeviceLocations(newLocs);
    }
  }, [devices]);

  // initialize name map from devices prop so users can rename locally
  useEffect(() => {
    const m = {};
    devices.forEach(d => { m[d.id] = d.name || d.id; });
    setNameMap(m);
  }, [devices]);


  // initialize Leaflet map once and update markers on change
  const mapRef = useRef(null);
  const boundaryRef = useRef(null);
  const tileLayerRef = useRef(null);
  
  // Handle map type change
  useEffect(() => {
    if (mapRef.current) {
      // Remove existing tile layer if it exists
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      // Add new tile layer
      tileLayerRef.current = L.tileLayer(mapLayers[mapType].url, {
        attribution: ''
      }).addTo(mapRef.current);
    }
  }, [mapType, mapLayers]);
  
  useEffect(() => {
    if (mapRef.current === null) {
      // default center, we'll recenter once we have validLocations
      const initCenter = validLocations.length > 0
        ? [validLocations[0].latitude, validLocations[0].longitude]
        : [14.4324, 75.9566]; // Default to user's location area
      mapRef.current = L.map('leaflet-map', {
        center: initCenter,
        zoom: 16, // Closer zoom for local view
        scrollWheelZoom: 'center',   // zoom toward map center
        doubleClickZoom: true,       // re-enable double click
        zoomControl: true,
        dragging: true,
        touchZoom: 'center',         // smoother touch zoom
        inertia: true,
        inertiaDeceleration: 3000,
        zoomSnap: 0,                 // allow fractional zoom
        zoomDelta: 0.25,
        zoomAnimation: true,
        easeLinearity: 0.25,         // smoother easing
        attributionControl: false   // hide default attribution
      });
      // Initialize map and store tile layer reference
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '' // no visible attribution
      });
      tileLayerRef.current = tileLayer;
      tileLayer.addTo(mapRef.current);
    }

    if (mapRef.current) {
      // Clear existing markers
      if (mapRef.current._markerGroup) {
        mapRef.current._markerGroup.clearLayers();
      } else {
        mapRef.current._markerGroup = L.layerGroup().addTo(mapRef.current);
      }

      // Add markers for each device
      validLocations.forEach(loc => {
        const m = L.marker([loc.latitude, loc.longitude]);
        m.bindPopup(loc.location_name || loc.id);
        m.on('click', () => onDeviceClick(loc.id));
        mapRef.current._markerGroup.addLayer(m);
      });

      // Fit map to show all markers with boundary - always update when validLocations changes
      if (validLocations.length > 0) {
        // Calculate bounds from all device locations
        const lats = validLocations.map(loc => loc.latitude);
        const lngs = validLocations.map(loc => loc.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        // Add padding around the bounds (about 50 meters)
        const padding = 0.001; // ~100 meters
        const bounds = [
          [minLat - padding, minLng - padding],
          [maxLat + padding, maxLng + padding]
        ];
        
        // Remove old boundary if exists
        if (boundaryRef.current) {
          mapRef.current.removeLayer(boundaryRef.current);
        }
        
        // Add new boundary rectangle around all devices
        boundaryRef.current = L.rectangle(bounds, {
          color: '#22c55e', // Green border
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.1,
          dashArray: '5, 10' // Dashed line
        }).addTo(mapRef.current);
        
        // Fit map to show all devices
        mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
      } else {
        // No devices - remove boundary
        if (boundaryRef.current) {
          mapRef.current.removeLayer(boundaryRef.current);
          boundaryRef.current = null;
        }
      }

      // ensure zoom behavior options remain applied
      mapRef.current.options.scrollWheelZoom = true;
      mapRef.current.options.zoomDelta = 0.25;
      mapRef.current.options.easeLinearity = 0.25;

      // attach click listener for coordinate picking
      // map click handler for picking coordinates;
      // attach/detach whenever pickMode changes so closure has fresh value
      if (mapRef.current) {
        const handler = (e) => {
          // if editing existing device
          if (pickMode) {
            const { lat, lng } = e.latlng;
            setFormData(prev => ({
              ...prev,
              latitude: lat.toString(),
              longitude: lng.toString()
            }));
            setPickMode(false);
          }
          // if picking location for a new device
          else if (addPickMode) {
            const { lat, lng } = e.latlng;
            if (onNewLocationPick) {
              onNewLocationPick(lat, lng);
            }
          }
        };
        mapRef.current.on('click', handler);
        return () => {
          mapRef.current.off('click', handler);
        };
      }
    }
  }, [validLocations, onDeviceClick, pickMode, addPickMode, onNewLocationPick]);

  // pan map when a device is selected via props
  useEffect(() => {
    if (
      mapRef.current &&
      selectedDevice &&
      deviceLocations[selectedDevice] &&
      deviceLocations[selectedDevice].latitude &&
      deviceLocations[selectedDevice].longitude
    ) {
      const lat = parseFloat(deviceLocations[selectedDevice].latitude);
      const lng = parseFloat(deviceLocations[selectedDevice].longitude);
      // zoom level when focusing a device; jump to a close view
      let targetZoom = 18; // maximum close‑up
      const max = mapRef.current.getMaxZoom ? mapRef.current.getMaxZoom() : targetZoom;
      targetZoom = Math.min(targetZoom, max);
      mapRef.current.setView([lat, lng], targetZoom, { animate: true });
    }
  }, [selectedDevice, deviceLocations]);


  const handleEditClick = (deviceId) => {
    const loc = deviceLocations[deviceId] || {};
    setFormData({
      latitude: loc.latitude?.toString() || "",
      longitude: loc.longitude?.toString() || "",
      location_name: loc.location_name || "",
      name: nameMap[deviceId] || ""
    });
    setEditingDevice(deviceId);
  };

  const handleSave = () => {
    if (!editingDevice) return;

    // allow saving name/configuration without coordinates
    const latStr = (formData.latitude || "").toString().trim();
    const lngStr = (formData.longitude || "").toString().trim();
    const latProvided = latStr !== "";
    const lngProvided = lngStr !== "";

    // require both coordinates if one is provided
    if (latProvided !== lngProvided) {
      alert("Please provide both latitude and longitude to update coordinates.");
      return;
    }

    let lat = null;
    let lng = null;
    if (latProvided && lngProvided) {
      lat = parseFloat(latStr);
      lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid numeric latitude and longitude values before saving.");
        return;
      }
    }
    
    // include authorization header so backend can verify ownership
    const hdrs = { "Content-Type": "application/json" };
    const t = localStorage.getItem("token");
    if (t) hdrs["Authorization"] = `Bearer ${t}`;

    fetch(`http://localhost:5000/api/devices/${editingDevice}/location`, {
      method: "PUT",
      headers: hdrs,
      body: JSON.stringify({
        name: formData.name || null,
        latitude: lat,
        longitude: lng,
        location_name: formData.location_name || null
      })
    }).then(() => {
      setDeviceLocations(prev => ({
        ...prev,
        [editingDevice]: {
          ...prev[editingDevice],
          latitude: lat !== null ? lat : prev[editingDevice]?.latitude || null,
          longitude: lng !== null ? lng : prev[editingDevice]?.longitude || null,
          location_name: formData.location_name || prev[editingDevice]?.location_name || null
        }
      }));
      setNameMap(prev => ({ ...prev, [editingDevice]: formData.name }));
      setEditingDevice(null);
    });
  };

  return (
    <div className="gps-map-container">
      <div className="gps-map-header">
        <h3>📍 GPS Sensor Map</h3>
        <div className="map-type-selector">
          <label>Map Type:</label>
          <select value={mapType} onChange={(e) => setMapType(e.target.value)}>
            {Object.entries(mapLayers).map(([key, layer]) => (
              <option key={key} value={key}>{layer.name}</option>
            ))}
          </select>
        </div>
        <div className="gps-legend">
          <span className="legend-item"><span className="dot online"></span> Online</span>
          <span className="legend-item"><span className="dot offline"></span> Offline</span>
        </div>
      </div>

      <div className="gps-content">
        <div className="map-section">
          <div id="leaflet-map" style={{ height: 400, width: 600, borderRadius: '12px' }} />
          {(pickMode || addPickMode) && (
            <div className="map-pick-overlay">
              <p>Click on the map to choose location</p>
            </div>
          )}
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
                    <span 
                      className="sensor-name clickable-device-name" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeviceNameClick) onDeviceNameClick(device.id);
                      }}
                      title="Click to view device details"
                    >
                      {nameMap[device.id] || device.name || device.id}
                    </span>
                  </div>
                  <div className="sensor-coords">
                    {loc.latitude && loc.longitude ? (
                      <>
                        <span>{(+loc.latitude).toFixed(4)}</span>
                        <span>{(+loc.longitude).toFixed(4)}</span>
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
                  {onDeleteDevice && (
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDevice(device.id, device.name || device.id);
                      }}
                      title="Delete device"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDevice && !pickMode && (
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
              <label>Device Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Friendly name (e.g. North Garden)"
              />
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleSave}>Save</button>
              <button className="cancel-btn" onClick={() => setEditingDevice(null)}>Cancel</button>
            </div>
            <div className="map-pick-controls">
              <button
                className="pick-map-btn"
                onClick={() => {
                  setPickMode(true);
                }}
              >
                📍 Pick on map
              </button>
              <button
                className="use-location-btn"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                      setFormData(prev => ({
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
            {pickMode && (
              <p className="pick-hint">Click anywhere on the map to choose coordinates</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
