# TODO - Multi-Device Chart with Min/Max Lines

## Task: Show all devices in single chart for temp, moisture, humidity with min/max lines

### Steps:
- [x] 1. Analyze codebase and create plan
- [x] 2. Update MultiDeviceChart.jsx - Implement multi-device chart with metric selector and min/max reference lines
- [x] 3. Update App.jsx - Pass deviceHistory and alertSettings props to MultiDeviceChart
- [x] 4. Add CSS styles for the multi-device chart
- [x] 5. Implementation Complete

### Implementation Details:
- Use alertSettings min/max values as reference lines
- Default values if no settings exist:
  - Temp: 10°C - 40°C
  - Humidity: 20% - 90%
  - Soil: 1500 - 3000
- Add dropdown to switch between Temperature, Soil Moisture, Humidity
- Plot each device as separate colored line

