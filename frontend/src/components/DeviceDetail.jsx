import { useState, useEffect } from "react";
import StatCard from "./statcard";
import SensorChart from "./sensorchart";
import DataTable from "./datatable";

export default function DeviceDetail({ device, data, history, fullHistory, onBack }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [detailHistory, setDetailHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch history based on time range
  useEffect(() => {
    if (!device?.id) return;
    
    const token = localStorage.getItem("token");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    
    setLoadingHistory(true);
    fetch(`http://localhost:5000/api/history/${device.id}?range=${timeRange}`, { headers })
      .then(r => r.json())
      .then(data => {
        setDetailHistory(data || []);
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error('Failed to load history:', err);
        setLoadingHistory(false);
      });
  }, [device?.id, timeRange]);

  const getCardInfo = (title) => {
    const info = {
      "Soil": {
        description: "Soil moisture sensor reading",
        range: "0 to 4095 ADC",
        tips: "Higher values indicate dry soil, lower values indicate wet soil. Typical range for watered plants: 1500-2500 ADC"
      },
      "Temp": {
        description: "Temperature sensor reading",
        range: "-40 to +125°C",
        tips: "Normal room temperature: 20-25°C. Keep sensors in shade to avoid solar heating"
      },
      "Humidity": {
        description: "Humidity sensor reading",
        range: "0 to 100%",
        tips: "Readings above 95% may indicate water accumulation. Typical outdoor humidity: 30-80%"
      },
      "RSSI": {
        description: "Received Signal Strength Indicator",
        range: "-30 to -120 dBm",
        tips: "Higher (closer to 0) is better. -50 dBm is excellent signal"
      }
    };
    return info[title] || {};
  };

  return (
    <div className="device-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>{device.name || device.id}</h2>
        <div className="detail-info">
          <span className={data?.status === 'online' ? "online-badge" : "offline-badge"}>
            {data?.status === 'online' ? "🟢 Online" : "🔴 Offline"}
          </span>
          <span className="device-id-badge">ID: {device.id}</span>
        </div>
      </div>

      <div className="grid">
        <StatCard title="Soil" value={data?.soil} unit="ADC" onClick={() => setSelectedCard(selectedCard === "Soil" ? null : "Soil")} isSelected={selectedCard === "Soil"} info={getCardInfo("Soil")} />
        <StatCard title="Temp" value={data?.temperature} unit="°C" onClick={() => setSelectedCard(selectedCard === "Temp" ? null : "Temp")} isSelected={selectedCard === "Temp"} info={getCardInfo("Temp")} />
        <StatCard title="Humidity" value={data?.humidity} unit="%" onClick={() => setSelectedCard(selectedCard === "Humidity" ? null : "Humidity")} isSelected={selectedCard === "Humidity"} info={getCardInfo("Humidity")} />
        <StatCard title="RSSI" value={data?.rssi} unit="dBm" onClick={() => setSelectedCard(selectedCard === "RSSI" ? null : "RSSI")} isSelected={selectedCard === "RSSI"} info={getCardInfo("RSSI")} />
      </div>

      {selectedCard && (
        <div className="card-info-panel">
          <h3>{selectedCard} Details</h3>
          <p><strong>Description:</strong> {getCardInfo(selectedCard).description}</p>
          <p><strong>Range:</strong> {getCardInfo(selectedCard).range}</p>
          <p><strong>Tip:</strong> {getCardInfo(selectedCard).tips}</p>
        </div>
      )}

      {/* Time Range Selector for Device Detail */}
      <div className="detail-time-range">
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
        <div className="time-range-info">
          <span>📊 Showing: <strong>{timeRange === '1h' ? 'Last 1 Hour' : timeRange === '6h' ? 'Last 6 Hours' : timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'All Time'}</strong></span>
          <span className="data-count">({loadingHistory ? 'Loading...' : `${detailHistory.length} readings`})</span>
        </div>
      </div>

      <div className="charts">
        <SensorChart title="Soil Moisture" data={detailHistory.length > 0 ? detailHistory : history} dataKey="soil" color="#22c55e" unit="ADC" />
        <SensorChart title="Temperature" data={detailHistory.length > 0 ? detailHistory : history} dataKey="temperature" color="#f97316" unit="°C" />
        <SensorChart title="Humidity" data={detailHistory.length > 0 ? detailHistory : history} dataKey="humidity" color="#38bdf8" unit="%" />
      </div>

      <div className="history-section">
        <h3>Sensor History</h3>
        <DataTable data={detailHistory.length > 0 ? detailHistory : (fullHistory.length > 0 ? fullHistory : history)} showFull={detailHistory.length > 0 || fullHistory.length > 0} />
      </div>
    </div>
  );
}
