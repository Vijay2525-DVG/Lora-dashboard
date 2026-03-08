import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function Reports({ token, onBack }) {
  const [activeTab, setActiveTab] = useState("daily");
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [weeklyStartDate, setWeeklyStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [weeklyEndDate, setWeeklyEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [alertsStartDate, setAlertsStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [alertsEndDate, setAlertsEndDate] = useState(new Date().toISOString().split("T")[0]);

  const apiFetch = async (url, options = {}) => {
    const hdrs = { ...(options.headers || {}) };
    if (token) {
      hdrs["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { ...options, headers: hdrs });
    return resp;
  };

  // Fetch daily summary data
  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyData();
    }
  }, [activeTab, selectedDate]);

  // Fetch weekly data
  useEffect(() => {
    if (activeTab === "weekly") {
      fetchWeeklyData();
    }
  }, [activeTab, weeklyStartDate, weeklyEndDate]);

  // Fetch alerts history
  useEffect(() => {
    if (activeTab === "alerts") {
      fetchAlertsData();
    }
  }, [activeTab, alertsStartDate, alertsEndDate]);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(
        `http://localhost:5000/api/reports/daily-summary?date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      } else {
        setError("Failed to fetch daily summary");
      }
    } catch (err) {
      setError("Error fetching daily summary: " + err.message);
    }
    setLoading(false);
  };

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(
        `http://localhost:5000/api/reports/weekly-data?startDate=${weeklyStartDate}&endDate=${weeklyEndDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setWeeklyData(data);
      } else {
        setError("Failed to fetch weekly data");
      }
    } catch (err) {
      setError("Error fetching weekly data: " + err.message);
    }
    setLoading(false);
  };

  const fetchAlertsData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(
        `http://localhost:5000/api/reports/alerts-history?startDate=${alertsStartDate}&endDate=${alertsEndDate}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setAlertsData(data);
      } else {
        setError("Failed to fetch alerts history");
      }
    } catch (err) {
      setError("Error fetching alerts history: " + err.message);
    }
    setLoading(false);
  };

  // CSV Export functions
  const exportDailyCSV = () => {
    if (!dailyData || !dailyData.devices) return;

    const headers = [
      "Device Name",
      "Location",
      "Reading Count",
      "Avg Soil",
      "Min Soil",
      "Max Soil",
      "Avg Temp (°C)",
      "Min Temp (°C)",
      "Max Temp (°C)",
      "Avg Humidity (%)",
      "Min Humidity (%)",
      "Max Humidity (%)",
      "Avg RSSI",
      "Max Battery"
    ];

    const rows = dailyData.devices.map(d => [
      d.device_name,
      d.location_name || "",
      d.reading_count,
      d.avg_soil || "",
      d.min_soil || "",
      d.max_soil || "",
      d.avg_temperature || "",
      d.min_temperature || "",
      d.max_temperature || "",
      d.avg_humidity || "",
      d.min_humidity || "",
      d.max_humidity || "",
      d.avg_rssi || "",
      d.max_battery || ""
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadCSV(csvContent, `daily_summary_${selectedDate}.csv`);
  };

  const exportWeeklyCSV = () => {
    if (!weeklyData || !weeklyData.devices) return;

    const headers = ["Device Name", "Date", "Hour", "Reading Count", "Avg Soil", "Avg Temp (°C)", "Avg Humidity (%)", "Avg RSSI"];
    
    const rows = [];
    weeklyData.devices.forEach(device => {
      device.readings.forEach(reading => {
        rows.push([
          device.device_name,
          reading.date,
          reading.hour,
          reading.reading_count,
          reading.avg_soil || "",
          reading.avg_temperature || "",
          reading.avg_humidity || "",
          reading.avg_rssi || ""
        ]);
      });
    });

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadCSV(csvContent, `weekly_data_${weeklyStartDate}_${weeklyEndDate}.csv`);
  };

  const exportAlertsCSV = () => {
    if (!alertsData || !alertsData.alerts) return;

    const headers = ["Timestamp", "Device Name", "Type", "Severity", "Value", "Threshold", "Unit", "Message"];

    const rows = alertsData.alerts.map(alert => [
      alert.timestamp,
      alert.device_name,
      alert.type,
      alert.severity,
      alert.value,
      alert.threshold,
      alert.unit,
      alert.message
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadCSV(csvContent, `alerts_${alertsStartDate}_${alertsEndDate}.csv`);
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // PDF Export functions
  const exportDailyPDF = () => {
    if (!dailyData || !dailyData.devices) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Daily Summary Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date: ${dailyData.date}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

    // Table
    const tableData = dailyData.devices.map(d => [
      d.device_name,
      d.location_name || "-",
      d.reading_count,
      d.avg_soil || "-",
      d.avg_temperature ? `${d.avg_temperature}°C` : "-",
      d.avg_humidity ? `${d.avg_humidity}%` : "-",
      d.avg_rssi || "-"
    ]);

    doc.autoTable({
      head: [["Device", "Location", "Readings", "Avg Soil", "Avg Temp", "Avg Humidity", "Avg RSSI"]],
      body: tableData,
      startY: 45,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94] }
    });

    doc.save(`daily_summary_${selectedDate}.pdf`);
  };

  const exportWeeklyPDF = () => {
    if (!weeklyData || !weeklyData.devices) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Weekly Sensor Data Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${weeklyData.startDate} to ${weeklyData.endDate}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

    let yPos = 45;
    weeklyData.devices.forEach(device => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(device.device_name, 14, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");

      const tableData = device.readings.slice(0, 24).map(r => [
        r.date,
        r.hour !== null ? `${r.hour}:00` : "-",
        r.reading_count,
        r.avg_soil || "-",
        r.avg_temperature ? `${r.avg_temperature}°C` : "-",
        r.avg_humidity ? `${r.avg_humidity}%` : "-"
      ]);

      doc.autoTable({
        head: [["Date", "Hour", "Count", "Avg Soil", "Avg Temp", "Avg Humidity"]],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [56, 189, 248] },
        margin: { left: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`weekly_data_${weeklyStartDate}_${weeklyEndDate}.pdf`);
  };

  const exportAlertsPDF = () => {
    if (!alertsData || !alertsData.alerts) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Alert History Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${alertsData.startDate} to ${alertsData.endDate}`, 14, 32);
    doc.text(`Total Alerts: ${alertsData.totalAlerts}`, 14, 38);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

    const tableData = alertsData.alerts.slice(0, 50).map(a => [
      a.timestamp ? a.timestamp.substring(0, 16) : "-",
      a.device_name,
      a.type.replace(/_/g, " ").toUpperCase(),
      a.severity.toUpperCase(),
      a.value !== null ? `${a.value}${a.unit}` : "-"
    ]);

    doc.autoTable({
      head: [["Timestamp", "Device", "Type", "Severity", "Value"]],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    });

    doc.save(`alerts_${alertsStartDate}_${alertsEndDate}.pdf`);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "#dc2626";
      case "warning": return "#f59e0b";
      case "info": return "#3b82f6";
      default: return "#6b7280";
    }
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>📊 Reports</h2>
      </div>

      {/* Tabs */}
      <div className="reports-tabs">
        <button
          className={`tab-btn ${activeTab === "daily" ? "active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          Daily Summary
        </button>
        <button
          className={`tab-btn ${activeTab === "weekly" ? "active" : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly Data
        </button>
        <button
          className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          Alert Reports
        </button>
      </div>

      {/* Daily Summary Tab */}
      {activeTab === "daily" && (
        <div className="report-section">
          <div className="report-filters">
            <label>
              Date:
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
            <div className="export-buttons">
              <button className="export-btn csv" onClick={exportDailyCSV}>
                📄 Export CSV
              </button>
              <button className="export-btn pdf" onClick={exportDailyPDF}>
                📕 Export PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : dailyData && dailyData.devices.length > 0 ? (
            <div className="report-content">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Location</th>
                    <th>Readings</th>
                    <th>Avg Soil</th>
                    <th>Min-Max Soil</th>
                    <th>Avg Temp</th>
                    <th>Min-Max Temp</th>
                    <th>Avg Humidity</th>
                    <th>Min-Max Humidity</th>
                    <th>Avg RSSI</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.devices.map((device, idx) => (
                    <tr key={idx}>
                      <td>{device.device_name}</td>
                      <td>{device.location_name || "-"}</td>
                      <td>{device.reading_count}</td>
                      <td>{device.avg_soil || "-"}</td>
                      <td>{device.min_soil || "-"} - {device.max_soil || "-"}</td>
                      <td>{device.avg_temperature ? `${device.avg_temperature}°C` : "-"}</td>
                      <td>
                        {device.min_temperature ? `${device.min_temperature}°C` : "-"} -{" "}
                        {device.max_temperature ? `${device.max_temperature}°C` : "-"}
                      </td>
                      <td>{device.avg_humidity ? `${device.avg_humidity}%` : "-"}</td>
                      <td>
                        {device.min_humidity ? `${device.min_humidity}%` : "-"} -{" "}
                        {device.max_humidity ? `${device.max_humidity}%` : "-"}
                      </td>
                      <td>{device.avg_rssi || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">No data available for this date</div>
          )}
        </div>
      )}

      {/* Weekly Data Tab */}
      {activeTab === "weekly" && (
        <div className="report-section">
          <div className="report-filters">
            <label>
              Start Date:
              <input
                type="date"
                value={weeklyStartDate}
                onChange={(e) => setWeeklyStartDate(e.target.value)}
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={weeklyEndDate}
                onChange={(e) => setWeeklyEndDate(e.target.value)}
              />
            </label>
            <div className="export-buttons">
              <button className="export-btn csv" onClick={exportWeeklyCSV}>
                📄 Export CSV
              </button>
              <button className="export-btn pdf" onClick={exportWeeklyPDF}>
                📕 Export PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : weeklyData && weeklyData.devices.length > 0 ? (
            <div className="report-content">
              {weeklyData.devices.map((device, idx) => (
                <div key={idx} className="device-weekly-data">
                  <h3>{device.device_name}</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Hour</th>
                        <th>Readings</th>
                        <th>Avg Soil</th>
                        <th>Avg Temp</th>
                        <th>Avg Humidity</th>
                        <th>Avg RSSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {device.readings.map((reading, rIdx) => (
                        <tr key={rIdx}>
                          <td>{reading.date}</td>
                          <td>{reading.hour !== null ? `${reading.hour}:00` : "-"}</td>
                          <td>{reading.reading_count}</td>
                          <td>{reading.avg_soil || "-"}</td>
                          <td>{reading.avg_temperature ? `${reading.avg_temperature}°C` : "-"}</td>
                          <td>{reading.avg_humidity ? `${reading.avg_humidity}%` : "-"}</td>
                          <td>{reading.avg_rssi || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No data available for this period</div>
          )}
        </div>
      )}

      {/* Alert Reports Tab */}
      {activeTab === "alerts" && (
        <div className="report-section">
          <div className="report-filters">
            <label>
              Start Date:
              <input
                type="date"
                value={alertsStartDate}
                onChange={(e) => setAlertsStartDate(e.target.value)}
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={alertsEndDate}
                onChange={(e) => setAlertsEndDate(e.target.value)}
              />
            </label>
            <div className="export-buttons">
              <button className="export-btn csv" onClick={exportAlertsCSV}>
                📄 Export CSV
              </button>
              <button className="export-btn pdf" onClick={exportAlertsPDF}>
                📕 Export PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : alertsData && alertsData.alerts.length > 0 ? (
            <div className="report-content">
              <div className="alerts-summary">
                <span className="total-alerts">Total Alerts: {alertsData.totalAlerts}</span>
              </div>
              <table className="report-table alerts-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Device</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Value</th>
                    <th>Threshold</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsData.alerts.map((alert, idx) => (
                    <tr key={idx}>
                      <td>{alert.timestamp ? alert.timestamp.substring(0, 16) : "-"}</td>
                      <td>{alert.device_name}</td>
                      <td>{alert.type.replace(/_/g, " ")}</td>
                      <td>
                        <span
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(alert.severity) }}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        {alert.value !== null ? `${alert.value}${alert.unit}` : "-"}
                      </td>
                      <td>
                        {alert.threshold !== null ? `${alert.threshold}${alert.unit}` : "-"}
                      </td>
                      <td className="message-cell">{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">No alerts found for this period</div>
          )}
        </div>
      )}
    </div>
  );
}

