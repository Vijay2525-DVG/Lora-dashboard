import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function GPSMap({ devices, onDeviceClick, selectedDevice }) {
  const [deviceLocations, setDeviceLocations] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({ latitude: "", longitude: "", location_name: "" });
  const [pickMode, setPickMode] = useState(false); // when true, next map click sets coordinates

  const validLocations = useMemo(() => {
    return Object.entries(deviceLocations)
      .filter(([, loc]) => loc.latitude && loc.longitude)
      .map(([id, loc]) => ({ id, ...loc }));
  }, [deviceLocations]);

  // Load device locations from API
  useEffect(() => {
    fetch("http://localhost:5000/api/gps-map")
      .then(r => r.json())
      .then(data => {
        const locs = {};
        data.forEach(d => {
          locs[d.id] = {
            latitude: d.latitude !== null ? parseFloat(d.latitude) : null,
            longitude: d.longitude !== null ? parseFloat(d.longitude) : null,
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
      const baseLat = 14.4324;
      const baseLng = 75.9566;
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


  // initialize Leaflet map once and update markers on change
  const mapRef = useRef(null);
  useEffect(() => {
    if (mapRef.current === null) {
      // default center, we'll recenter once we have validLocations
      const initCenter = validLocations.length > 0
        ? [validLocations[0].latitude, validLocations[0].longitude]
        : [0, 0];
      mapRef.current = L.map('leaflet-map', {
        center: initCenter,
        zoom: 2,
        zoom: 13,
        scrollWheelZoom: true,       // allow wheel zoom
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
      // switch to satellite imagery tile layer (ESRI World Imagery)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '' // no visible attribution
      }).addTo(mapRef.current);
    }

    if (mapRef.current) {
      if (mapRef.current._markerGroup) {
        mapRef.current._markerGroup.clearLayers();
      } else {
        mapRef.current._markerGroup = L.layerGroup().addTo(mapRef.current);
      }

      validLocations.forEach(loc => {
        const m = L.marker([loc.latitude, loc.longitude]);
        m.bindPopup(loc.location_name || loc.id);
        m.on('click', () => onDeviceClick(loc.id));
        mapRef.current._markerGroup.addLayer(m);
      });

      if (validLocations.length > 0 && !mapRef.current._viewSet) {
        mapRef.current.setView([validLocations[0].latitude, validLocations[0].longitude], 13);
        mapRef.current._viewSet = true;
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
          console.log('map clicked', { pickMode, e });
          if (pickMode) {
            const { lat, lng } = e.latlng;
            console.log('picking coordinates', lat, lng);
            setFormData(prev => ({
              ...prev,
              latitude: lat.toString(),
              longitude: lng.toString()
            }));
            setPickMode(false);
          }
        };
        mapRef.current.on('click', handler);
        return () => {
          mapRef.current.off('click', handler);
        };
      }
    }
  }, [validLocations, onDeviceClick, pickMode]);

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
          <div id="leaflet-map" style={{ height: 400, width: 600, borderRadius: '12px' }} />
          {pickMode && (
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
                    <span className="sensor-name">{device.name || device.id}</span>
                    <span className="sensor-location">{loc.location_name || 'No location'}</span>
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
