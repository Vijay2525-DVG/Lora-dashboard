import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C, Icon } from "../App";

const DEVICE_COLORS = ["#4ade80","#60a5fa","#fbbf24","#f87171","#a78bfa","#34d399","#fb923c","#e879f9","#22d3ee","#f9a8d4"];

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

export default function GPSMap({
  devices,
  onDeviceClick,
  selectedDevice,
  addPickMode = false,
  onNewLocationPick,
  onDeviceNameClick,
  refreshKey = 0,
  onDeleteDevice = null,
}) {
  const [deviceLocations, setDeviceLocations] = useState({});
  const [nameMap, setNameMap] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({ latitude: "", longitude: "", location_name: "", name: "" });
  const [pickMode, setPickMode] = useState(false);
  const [mapType, setMapType] = useState("satellite");

  const mapLayers = {
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', name: 'Satellite' },
    streets: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', name: 'Streets' },
    terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', name: 'Terrain' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', name: 'Dark' }
  };

  const validLocations = useMemo(() => {
    return Object.entries(deviceLocations)
      .filter(([, loc]) => loc.latitude && loc.longitude)
      .map(([id, loc]) => ({ id, ...loc }));
  }, [deviceLocations]);

  useEffect(() => {
    const headers = {};
    const t = localStorage.getItem("token");
    if (t) headers["Authorization"] = `Bearer ${t}`;

    fetch("http://localhost:5000/api/gps-map", { headers })
      .then(r => {
        if (!r.ok) return r.json().then(err => { throw new Error(err.error || `HTTP ${r.status}`); });
        return r.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error("gps-map response was not an array");
        const locs = {};
        data.forEach(d => {
          locs[d.id] = {
            latitude: d.latitude !== null ? parseFloat(d.latitude) : null,
            longitude: d.longitude !== null ? parseFloat(d.longitude) : null,
            location_name: d.location_name,
            status: d.status
          };
        });
        if (data.length > 0) setDeviceLocations(locs);
      })
      .catch(err => console.error("Unable to load gps-map data", err));
  }, [refreshKey]);

  useEffect(() => {
    if (devices.length > 0) {
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
      if (Object.keys(newLocs).length > 0) {
        setDeviceLocations(prev => {
          const merged = { ...prev };
          Object.keys(newLocs).forEach(id => {
            if (newLocs[id].latitude && newLocs[id].longitude) merged[id] = newLocs[id];
          });
          return merged;
        });
      }
    }
  }, [devices, refreshKey]);

  useEffect(() => {
    if (devices.length > 0 && Object.keys(deviceLocations).length === 0) {
      const baseLat = 14.4324;
      const baseLng = 75.9566;
      const newLocs = {};
      devices.forEach((device, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
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

  const deviceColorMap = useMemo(() => {
    const m = {};
    devices.forEach((d, i) => {
      m[d.id] = DEVICE_COLORS[i % DEVICE_COLORS.length];
    });
    return m;
  }, [devices]);

  useEffect(() => {
    const m = {};
    devices.forEach(d => { m[d.id] = d.name || d.id; });
    setNameMap(m);
  }, [devices]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const boundaryRef = useRef(null);
  const tileLayerRef = useRef(null);

  const createMarkerIcon = (deviceId, status) => {
    const baseColor = deviceColorMap[deviceId] || "#60a5fa";
    const isSelected = selectedDevice === deviceId;
    const outerSize = isSelected ? 26 : 22;
    const innerSize = isSelected ? 14 : 10;
    const pulseShadow = status === "online" ? `${baseColor}66` : "#00000055";

    return L.divIcon({
      className: "",
      iconSize: [outerSize, outerSize],
      iconAnchor: [outerSize / 2, outerSize / 2],
      html: `
        <div style="
          width:${outerSize}px;
          height:${outerSize}px;
          border-radius:999px;
          background:rgba(10,15,10,0.9);
          border:2px solid ${baseColor};
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 0 12px ${pulseShadow};
        ">
          <div style="
            width:${innerSize}px;
            height:${innerSize}px;
            border-radius:999px;
            background:${status === "online" ? baseColor : C.textSub};
          "></div>
        </div>
      `
    });
  };

  useEffect(() => {
  if (!mapRef.current && mapContainerRef.current) {
    const initCenter = validLocations.length > 0
      ? [validLocations[0].latitude, validLocations[0].longitude]
      : [14.4324, 75.9566];
    mapRef.current = L.map(mapContainerRef.current, {
      center: initCenter,
      zoom: 16,
      scrollWheelZoom: 'center',
      doubleClickZoom: true,
      zoomControl: true,
      dragging: true,
      touchZoom: 'center',
      inertia: true,
      inertiaDeceleration: 3000,
      zoomSnap: 0,
      zoomDelta: 0.25,
      zoomAnimation: true,
      easeLinearity: 0.25,
      attributionControl: false
    });
    const tileLayer = L.tileLayer(mapLayers[mapType].url, { attribution: '' });
    tileLayerRef.current = tileLayer;
    tileLayer.addTo(mapRef.current);
    // Ensure proper sizing when first rendered inside flex layout
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 50);
  }
  if (mapRef.current && tileLayerRef.current == null) {
    const tileLayer = L.tileLayer(mapLayers[mapType].url, { attribution: '' });
    tileLayerRef.current = tileLayer;
    tileLayer.addTo(mapRef.current);
  }
  }, [validLocations, mapType]);

  useEffect(() => {
  if (mapRef.current && tileLayerRef.current) {
    mapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(mapLayers[mapType].url, { attribution: '' }).addTo(mapRef.current);
  }
  }, [mapType]);

  useEffect(() => {
  if (!mapRef.current) return;

  if (mapRef.current) {
      if (mapRef.current._markerGroup) {
        mapRef.current._markerGroup.clearLayers();
      } else {
        mapRef.current._markerGroup = L.layerGroup().addTo(mapRef.current);
      }

      validLocations.forEach(loc => {
        const icon = createMarkerIcon(loc.id, loc.status);
        const m = L.marker([loc.latitude, loc.longitude], { icon });
        m.bindPopup(loc.location_name || loc.id);
        m.on('click', () => onDeviceClick(loc.id));
        mapRef.current._markerGroup.addLayer(m);
      });

      if (validLocations.length > 0) {
        const lats = validLocations.map(loc => loc.latitude);
        const lngs = validLocations.map(loc => loc.longitude);
        const padding = 0.001;
        const bounds = [
          [Math.min(...lats) - padding, Math.min(...lngs) - padding],
          [Math.max(...lats) + padding, Math.max(...lngs) + padding]
        ];
        if (boundaryRef.current) mapRef.current.removeLayer(boundaryRef.current);
        boundaryRef.current = L.rectangle(bounds, {
          color: C.green, weight: 2, fillColor: C.green, fillOpacity: 0.1, dashArray: '5, 10'
        }).addTo(mapRef.current);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
      } else {
        if (boundaryRef.current) {
          mapRef.current.removeLayer(boundaryRef.current);
          boundaryRef.current = null;
        }
      }

      mapRef.current.options.scrollWheelZoom = true;
      mapRef.current.options.zoomDelta = 0.25;
      mapRef.current.options.easeLinearity = 0.25;

      const handler = (e) => {
        if (pickMode) {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
          setPickMode(false);
        } else if (addPickMode) {
          const { lat, lng } = e.latlng;
          if (onNewLocationPick) onNewLocationPick(lat, lng);
        }
      };
      mapRef.current.on('click', handler);
      return () => { mapRef.current.off('click', handler); };
    }
  }, [validLocations, onDeviceClick, pickMode, addPickMode, onNewLocationPick, createMarkerIcon, selectedDevice]);

  useEffect(() => {
    if (mapRef.current && selectedDevice && deviceLocations[selectedDevice] && deviceLocations[selectedDevice].latitude && deviceLocations[selectedDevice].longitude) {
      const lat = parseFloat(deviceLocations[selectedDevice].latitude);
      const lng = parseFloat(deviceLocations[selectedDevice].longitude);
      let targetZoom = 18;
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
    const latStr = (formData.latitude || "").toString().trim();
    const lngStr = (formData.longitude || "").toString().trim();
    const latProvided = latStr !== "";
    const lngProvided = lngStr !== "";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
          Farm Map
        </h1>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.textSub, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Map Style:</span>
            <select
              value={mapType}
              onChange={(e) => setMapType(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "4px 8px", color: C.text, fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              {Object.entries(mapLayers).map(([key, layer]) => (
                <option key={key} value={key}>{layer.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, borderLeft: `1px solid ${C.cardBorder}`, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
              <span style={{ color: C.textMuted, fontSize: 12 }}>Online</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red }} />
              <span style={{ color: C.textMuted, fontSize: 12 }}>Offline</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        {/* Map Container */}
        <div style={{ flex: 2, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden", position: "relative", minHeight: 400 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {(pickMode || addPickMode) && (
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.surface + "ee", backdropFilter: "blur(4px)", padding: "10px 20px", borderRadius: 20, border: `1.5px solid ${C.green}`, color: C.green, fontSize: 14, fontWeight: 700, zIndex: 1000, boxShadow: `0 4px 12px rgba(0,0,0,0.5)`, pointerEvents: "none" }}>
              📍 Click on the map to choose a location
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ flex: 1, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 280, maxWidth: 350 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.cardBorder}`, background: C.surface }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: 1, textTransform: "uppercase" }}>Registered Devices</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {devices.map(device => {
              const loc = deviceLocations[device.id] || {};
              const isSelected = selectedDevice === device.id;

              return (
                <div key={device.id}
                  onClick={() => onDeviceClick(device.id)}
                  style={{
                    padding: "14px 16px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                    background: isSelected ? C.green + "11" : C.surface,
                    border: `1.5px solid ${isSelected ? C.green + "55" : C.cardBorder}`,
                    display: "flex", flexDirection: "column", gap: 8
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: loc.status === 'online' ? C.green : C.textSub, boxShadow: loc.status === 'online' ? `0 0 6px ${C.green}` : "none" }} />
                      <span onClick={(e) => { e.stopPropagation(); if (onDeviceNameClick) onDeviceNameClick(device.id); }} style={{ color: isSelected ? C.green : C.text, fontWeight: 700, fontSize: 14 }}>
                        {nameMap[device.id] || device.name || device.id}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(device.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}>
                        <Icon name="settings" size={14} color={C.textMuted} />
                      </button>
                      {onDeleteDevice && (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteDevice(device.id, device.name || device.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}>
                          <Icon name="alerts" size={14} color={C.red + "bb"} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.textSub, fontFamily: "monospace" }}>
                    {loc.latitude && loc.longitude ? (
                      <><span>Lat: {(+loc.latitude).toFixed(4)}</span><span>Lng: {(+loc.longitude).toFixed(4)}</span></>
                    ) : (
                      <span style={{ color: C.amber + "aa" }}>No GPS Coordinates Set</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDevice && !pickMode && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditingDevice(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, width: "100%", maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Edit Location</h3>
              <button onClick={() => setEditingDevice(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={16} color={C.textMuted} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Device Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. North Garden Sensor"
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Latitude</label>
                  <input type="number" step="0.0001" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} placeholder="13.0823"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Longitude</label>
                  <input type="number" step="0.0001" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} placeholder="80.2707"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <Btn label="Pick on Map" icon="map" outline color={C.blue} style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => setPickMode(true)} />
                <Btn label="My Location" icon="settings" outline color={C.amber} style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                      setFormData(prev => ({ ...prev, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }));
                    });
                  }
                }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Btn label="Cancel" outline color={C.textMuted} onClick={() => setEditingDevice(null)} style={{ flex: 1 }} />
                <Btn label="Save Changes" color={C.green} onClick={handleSave} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
