export default function DataTable({ data }) {
  return (
    <div className="table">
      <h3>Recent Readings</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Soil</th>
            <th>Temp (°C)</th>
            <th>Humidity (%)</th>
            <th>RSSI (dBm)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.time || new Date(d.created_at).toLocaleTimeString()}</td>
              <td>{d.soil}</td>
              <td>{d.temperature}</td>
              <td>{d.humidity}</td>
              <td>{d.rssi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}