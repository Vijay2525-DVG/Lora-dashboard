# TODO: Reports Feature Implementation

## Backend (server.js)
- [x] 1. Add GET /api/reports/daily-summary - Get daily aggregated sensor data
- [x] 2. Add GET /api/reports/weekly-data - Get weekly sensor data with hourly/daily aggregation
- [x] 3. Add GET /api/reports/alerts-history - Get historical alerts

## Frontend
- [x] 4. Install jspdf and jspdf-autotable packages
- [x] 5. Create Reports.jsx component with:
      - Daily Summary report view
      - Weekly Sensor Data report view
      - Alert Reports view
      - CSV export functionality
      - PDF export functionality
- [x] 6. Add Reports navigation in dashboard header
- [x] 7. Update App.jsx to include Reports modal

## Reports Include:
1. **Daily Summary** - Aggregated daily data (avg/min/max temp, humidity, soil)
2. **Weekly Sensor Data** - Hourly/daily sensor readings for the week
3. **Alert Reports** - Historical alerts with timestamps and details

## Export Formats:
- **CSV** - Download sensor data as CSV files
- **PDF** - Generate formatted PDF reports with charts/tables

