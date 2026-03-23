import React, { useState, useEffect } from 'react';

const IrrigationScheduler = ({ token, apiFetch }) => {
  const [schedules, setSchedules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [aiStatus, setAiStatus] = useState({ ai_decisions: [], outage_alerts: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedules');
  const [selectedLand, setSelectedLand] = useState('');
  const [selectedSequence, setSelectedSequence] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const lands = [...new Set(devices.map(d => d.land_id))].filter(Boolean);
  const outages = aiStatus.outage_alerts || [];
  const activeOutages = outages.filter(o => !o.acknowledged);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const [schedulesRes, devicesRes, aiRes] = await Promise.all([
        apiFetch('http://localhost:5000/api/schedules', { headers }),
        apiFetch('http://localhost:5000/api/devices', { headers }),
        apiFetch('http://localhost:5000/api/ai-status', { headers })
      ]);
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (devicesRes.ok) setDevices(await devicesRes.json().filter(d => d.type === 'pump' || d.type === 'light'));
      if (aiRes.ok) setAiStatus(await aiRes.json());
    } catch (err) {
      console.error('Error fetching irrigation data:', err);
    }
    setLoading(false);
  };

  const startNow = async (deviceId, duration = 30) => {
    try {
      const res = await apiFetch(`http://localhost:5000/api/schedules/now`, {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId, duration })
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Start now failed');
    }
  };

  const acknowledgeOutage = async (id) => {
    try {
      await fetch(`/api/outage-alerts/${id}/ack`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ acknowledged: true })
      });
      refetchAI();
    } catch (err) {
      console.error('Ack failed:', err);
    }
  };

  if (loading) return <div>Loading irrigation system...</div>;

  return (
    <div className="irrigation-scheduler">
      {/* Outage Banner */}
      {activeOutages.length > 0 && (
        <div className="outage-banner">
          <h3>⚡ Power Outages Detected</h3>
          <div className="outage-list">
            {activeOutages.map(o => (
              <div key={o.id} className="outage-item">
                {o.message}
                <button onClick={() => acknowledgeOutage(o.id)}>Ack</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs selectedIndex={activeTab === 'schedules' ? 0 : 1} onSelect={idx => setActiveTab(idx === 0 ? 'schedules' : 'ai')}>
        <TabList>
          <Tab>Schedules</Tab>
          <Tab>AI Status</Tab>
        </TabList>

        <TabPanel>
          <h2>Irrigation Schedules</h2>
          <div className="schedule-controls">
            <select value={selectedLand} onChange={e => setSelectedLand(e.target.value)}>
              <option value="">All Lands</option>
              {lands.map(l => <option key={l} value={l}>Land {l}</option>)}
            </select>
            <select value={selectedSequence} onChange={e => setSelectedSequence(e.target.value)}>
              <option value="">Single Pump</option>
              <option value="1">Field 1 Sequence</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Land</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Pattern</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      {schedules
        .filter(s => !selectedLand || s.land_id == selectedLand)
        .map(schedule => (
          <tr key={schedule.id}>
            <td>{schedule.device_name} ({schedule.type})</td>
            <td>{schedule.land_name || '-'}</td>
            <td>{schedule.start_time}</td>
            <td>{schedule.duration_minutes} min</td>
            <td>{schedule.repeat_pattern}</td>
            <td>{schedule.status}</td>
            <td>
              <button onClick={() => startNow(schedule.device_id, schedule.duration_minutes)}>Start Now</button>
              <button onClick={() => startNow(schedule.device_id, 10)}>Quick 10min</button>
            </td>
          </tr>
        )) || <tr><td colSpan="7">No schedules</td></tr>}
            </tbody>
          </table>
        </TabPanel>

        <TabPanel>
          <h2>AI Decisions & Logs</h2>
          <div className="ai-stats">
            <h3>Recent AI Decisions</h3>
            <table>
              <thead>
                <tr>
                  <th>Land</th>
                  <th>Soil</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>Confidence</th>
                  <th>Action</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {aiStatus?.ai_decisions?.map(dec => (
                  <tr key={dec.id}>
                    <td>{dec.land_id}</td>
                    <td>{dec.avg_soil}</td>
                    <td>{dec.avg_temp?.toFixed(1)}°C</td>
                    <td>{dec.avg_humidity?.toFixed(1)}%</td>
                    <td>{(dec.ai_confidence * 100).toFixed(0)}%</td>
                    <td>{dec.recommended_action}</td>
                    <td>{new Date(dec.created_at).toLocaleString()}</td>
                  </tr>
                )) || <tr><td colSpan="7">No recent decisions</td></tr>}
              </tbody>
            </table>
          </div>
        </TabPanel>
      </Tabs>

      <style jsx>{`
        .irrigation-scheduler { padding: 20px; }
        .outage-banner { background: #ff4444; color: white; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .outage-item { display: flex; justify-content: space-between; align-items: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        button { background: #4CAF50; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px; }
        button:hover { background: #45a049; }
        .schedule-controls { margin-bottom: 15px; }
        select { margin-right: 10px; padding: 5px; }
      `}</style>
    </div>
  );
};

export default IrrigationScheduler;

