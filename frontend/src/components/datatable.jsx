import { useState } from "react";

export default function DataTable({ data, showFull = false }) {
  const title = showFull ? "Full History" : "Recent Readings";
  const [monthFilter, setMonthFilter] = useState('All');

  // compute available month-year strings
  const months = Array.from(new Set(
    data.map(d => {
      const dt = new Date(d.created_at || d.time);
      return dt.toLocaleString('default', { month: 'long', year: 'numeric' });
    })
  ));

  const filtered = monthFilter === 'All'
    ? data
    : data.filter(d => {
        const dt = new Date(d.created_at || d.time);
        return dt.toLocaleString('default', { month: 'long', year: 'numeric' }) === monthFilter;
      });

  return (
    <div className="table">
      <h3>{title}</h3>
      {months.length > 0 && (
        <div className="month-filter">
          <label>Show month: </label>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option>All</option>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Soil</th>
            <th>Temp (°C)</th>
            <th>Humidity (%)</th>
            <th>RSSI (dBm)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d, i) => {
            const dt = new Date(d.created_at || d.time);
            return (
              <tr key={i}>
                <td>{dt.toLocaleDateString()}</td>
                <td>{dt.toLocaleTimeString()}</td>
                <td>{d.soil}</td>
                <td>{d.temperature}</td>
                <td>{d.humidity}</td>
                <td>{d.rssi}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}