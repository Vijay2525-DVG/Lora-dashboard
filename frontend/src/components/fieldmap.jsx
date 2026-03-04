import { useState, useEffect } from "react";

export default function FieldMap({ devices, onDeviceClick, selectedDevice }) {
  const [fieldMap, setFieldMap] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [fields, setFields] = useState(["Field A", "Field B"]);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  // Initialize field map from devices
  useEffect(() => {
    const map = {};
    const uniqueFields = new Set();
    
    devices.forEach(device => {
      const fieldName = device.field_name || "Field A";
      const row = device.field_row || 1;
      const col = device.field_col || 1;
      
      uniqueFields.add(fieldName);
      
      const key = `${fieldName}-${row}-${col}`;
      map[key] = {
        deviceId: device.id,
        deviceName: device.name,
        status: device.status
      };
    });
    
    setFieldMap(map);
    setFields([...uniqueFields]);
  }, [devices]);

  const getDeviceAtCell = (fieldName, row, col) => {
    const key = `${fieldName}-${row}-${col}`;
    return fieldMap[key];
  };

  const handleCellClick = (fieldName, row, col) => {
    const device = getDeviceAtCell(fieldName, row, col);
    if (device) {
      onDeviceClick(device.deviceId);
    } else {
      // Open selector to assign a device
      setEditingCell({ fieldName, row, col });
    }
  };

  const handleDeviceSelect = (deviceId) => {
    if (editingCell && deviceId) {
      const { fieldName, row, col } = editingCell;
      
      // Save to backend
      // include token so backend can check ownership
      const hdrs = { "Content-Type": "application/json" };
      const t = localStorage.getItem("token");
      if (t) hdrs["Authorization"] = `Bearer ${t}`;
      fetch(`http://localhost:5000/api/devices/${deviceId}/location`, {
        method: "PUT",
        headers: hdrs,
        body: JSON.stringify({
          field_row: row,
          field_col: col,
          field_name: fieldName
        })
      }).then(() => {
        // Update local state
        const key = `${fieldName}-${row}-${col}`;
        const device = devices.find(d => d.id === deviceId);
        setFieldMap(prev => ({
          ...prev,
          [key]: {
            deviceId: device.id,
            deviceName: device.name,
            status: device.status
          }
        }));
        setEditingCell(null);
      });
    } else {
      setEditingCell(null);
    }
  };

  const availableDevices = devices.filter(d => {
    // Check if device is already placed
    return !Object.values(fieldMap).some(m => m.deviceId === d.id);
  });

  return (
    <div className="field-map-container">
      <div className="field-map-header">
        <h3>🗺️ Field Map</h3>
        <div className="field-legend">
          <span className="legend-item"><span className="dot online"></span> Online</span>
          <span className="legend-item"><span className="dot offline"></span> Offline</span>
          <span className="legend-item"><span className="dot empty"></span> Empty</span>
        </div>
      </div>

      <div className="fields-container">
        {fields.map(fieldName => (
          <div key={fieldName} className="field-section">
            <h4 className="field-name">{fieldName}</h4>
            <div 
              className="field-grid"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`
              }}
            >
              {Array.from({ length: rows * cols }, (_, i) => {
                const row = Math.floor(i / cols) + 1;
                const col = (i % cols) + 1;
                const device = getDeviceAtCell(fieldName, row, col);
                const isSelected = device?.deviceId === selectedDevice;
                
                return (
                  <div
                    key={`${fieldName}-${row}-${col}`}
                    className={`grid-cell ${device ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''} ${device?.status === 'online' ? 'online' : 'offline'}`}
                    onClick={() => handleCellClick(fieldName, row, col)}
                  >
                    {device ? (
                      <>
                        <span className="cell-icon">📡</span>
                        <span className="cell-name">{device.deviceName || device.deviceId}</span>
                        <span className="cell-status">{device.status === 'online' ? '🟢' : '🔴'}</span>
                      </>
                    ) : (
                      <span className="cell-empty">+</span>
                    )}
                    <span className="cell-coord">R{row},C{col}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Device Selection Modal */}
      {editingCell && (
        <div className="modal-overlay" onClick={() => setEditingCell(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Assign Device to {editingCell.fieldName} (R{editingCell.row}, C{editingCell.col})</h3>
            
            <div className="device-list">
              {availableDevices.length > 0 ? (
                availableDevices.map(device => (
                  <button
                    key={device.id}
                    className="device-option"
                    onClick={() => handleDeviceSelect(device.id)}
                  >
                    <span>📡 {device.name || device.id}</span>
                    <span className={device.status === 'online' ? 'online' : 'offline'}>
                      {device.status === 'online' ? '🟢' : '🔴'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="no-devices">No unassigned devices available</p>
              )}
            </div>
            
            <button className="modal-close" onClick={() => setEditingCell(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
