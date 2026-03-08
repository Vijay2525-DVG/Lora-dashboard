import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts";

// Default min/max values when no alert settings exist
const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 40 },
  humidity: { min: 20, max: 90 },
  soil: { min: 1500, max: 3000 }
};

// Color palette for different devices
const DEVICE_COLORS = [
  "#22c55e", // green
  "#f97316", // orange
  "#38bdf8", // sky blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
  "#14b8a6", // teal
  "#f43f5e", // rose
];

export default function MultiDeviceChart({ devices, allDeviceData, deviceHistory, alertSettings }) {
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  // Get the data key and display info based on selected metric
  const metricConfig = {
    temperature: {
      dataKey: 'temperature',
      label: 'Temperature',
      unit: '°C',
      color: '#f97316'
    },
    humidity: {
      dataKey: 'humidity',
      label: 'Humidity',
      unit: '%',
      color: '#38bdf8'
    },
    soil: {
      dataKey: 'soil',
      label: 'Soil Moisture',
      unit: 'ADC',
      color: '#22c55e'
    }
  };

  // Calculate min/max thresholds from alertSettings
  const thresholds = useMemo(() => {
    const settings = Object.values(alertSettings || {});
    
    if (settings.length === 0) {
      return DEFAULT_THRESHOLDS[selectedMetric];
    }

    // Get all unique min/max values from alert settings
    const mins = [];
    const maxs = [];

    settings.forEach(s => {
      if (selectedMetric === 'temperature') {
        if (s.min_temp !== undefined) mins.push(s.min_temp);
        if (s.max_temp !== undefined) maxs.push(s.max_temp);
      } else if (selectedMetric === 'humidity') {
        if (s.min_humidity !== undefined) mins.push(s.min_humidity);
        if (s.max_humidity !== undefined) maxs.push(s.max_humidity);
      } else if (selectedMetric === 'soil') {
        if (s.min_soil !== undefined) mins.push(s.min_soil);
        if (s.max_soil !== undefined) maxs.push(s.max_soil);
      }
    });

    // Use average of all device thresholds, or default if none set
    const minValue = mins.length > 0 ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : DEFAULT_THRESHOLDS[selectedMetric].min;
    const maxValue = maxs.length > 0 ? Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length) : DEFAULT_THRESHOLDS[selectedMetric].max;

    return { min: minValue, max: maxValue };
  }, [alertSettings, selectedMetric]);

  // Prepare combined chart data from all devices
  const chartData = useMemo(() => {
    if (!deviceHistory || Object.keys(deviceHistory).length === 0) {
      return [];
    }

    // Get all unique timestamps from all devices
    const allTimestamps = new Set();
    const deviceDataMap = {};

    devices.forEach(device => {
      const history = deviceHistory[device.id] || [];
      deviceDataMap[device.id] = history;
      history.forEach(entry => {
        if (entry.time) {
          allTimestamps.add(entry.time);
        }
      });
    });

    // Sort timestamps (most recent first)
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => {
      // Try to parse as time strings for sorting
      return b.localeCompare(a);
    });

    // Create combined data array
    return sortedTimestamps.map(time => {
      const dataPoint = { time };
      
      devices.forEach((device, index) => {
        const history = deviceDataMap[device.id] || [];
        const entry = history.find(h => h.time === time);
        if (entry) {
          const dataKey = metricConfig[selectedMetric].dataKey;
          dataPoint[`${device.id}_${dataKey}`] = entry[dataKey];
        }
      });

      return dataPoint;
    });
  }, [deviceHistory, devices, selectedMetric]);

  // Check if we have any data
  const hasData = chartData.length > 0 && devices.length > 0;

  // Render the chart
  return (
    <div className="card chart multi-device-chart">
      <div className="chart-header">
        <h4>All Devices - Combined Chart</h4>
        <div className="metric-selector">
          <label>Metric:</label>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="temperature">🌡️ Temperature</option>
            <option value="humidity">💨 Humidity</option>
            <option value="soil">💧 Soil Moisture</option>
          </select>
        </div>
      </div>

      <div className="threshold-info">
        <span className="threshold-min">Min: {thresholds.min} {metricConfig[selectedMetric].unit}</span>
        <span className="threshold-max">Max: {thresholds.max} {metricConfig[selectedMetric].unit}</span>
      </div>

      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <XAxis 
                dataKey="time" 
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fill: "#94a3b8" }}
                domain={['auto', 'auto']}
                label={{ 
                  value: metricConfig[selectedMetric].unit, 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: "#94a3b8"
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => {
                  const device = devices.find(d => value.startsWith(d.id));
                  return device?.name || device?.id || value;
                }}
              />
              
              {/* Min/Max Reference Lines */}
              <ReferenceLine 
                y={thresholds.min} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Min: ${thresholds.min}`, 
                  fill: '#ef4444', 
                  fontSize: 11,
                  position: 'right'
                }}
              />
              <ReferenceLine 
                y={thresholds.max} 
                stroke="#3b82f6" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Max: ${thresholds.max}`, 
                  fill: '#3b82f6', 
                  fontSize: 11,
                  position: 'right'
                }}
              />
              
              {/* Lines for each device */}
              {devices.map((device, index) => {
                const dataKey = metricConfig[selectedMetric].dataKey;
                const lineKey = `${device.id}_${dataKey}`;
                const deviceName = device.name || device.id;
                
                return (
                  <Line
                    key={device.id}
                    type="monotone"
                    dataKey={lineKey}
                    name={deviceName}
                    stroke={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          
          <div className="chart-legend">
            {devices.map((device, index) => (
              <div key={device.id} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }}
                ></span>
                <span className="legend-device">{device.name || device.id}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-chart-data">
          <p>No historical data available for charting.</p>
          <p className="hint">Data will appear as sensors send readings.</p>
        </div>
      )}
    </div>
  );
}

