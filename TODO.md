# TODO: Show Total Alerts Count on Alert Button

## Steps:
1. [x] Analyze the codebase and understand the current alert system
2. [x] Add useEffect to fetch active alerts count in App.jsx
3. [x] Update the Alert button to show the count badge
4. [x] Test the implementation

## Implementation Details:
- Fetch active alerts from `http://localhost:5000/api/alerts/active`
- Update the `alertCount` state with the length of the returned array
- Show a badge on the alert button like: "🔔 Alerts (5)"
- Set up periodic polling to keep the count updated (every 30 seconds)

