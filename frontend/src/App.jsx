/* eslint-disable react-hooks/purity */
import { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend } from "recharts";
import Admin from "./pages/Admin";
import Landing from "./components/Landing";
import GPSMap from "./components/gpsmap";

// ─── Palette & Theme ───────────────────────────────────────────────────────
export const C = {
  bg: "#0a0f0a",
  surface: "#111811",
  card: "#151e15",
  cardBorder: "#1e2e1e",
  green: "#4ade80",
  greenDim: "#22c55e",
  greenGlow: "#16a34a",
  amber: "#fbbf24",
  red: "#f87171",
  blue: "#60a5fa",
  text: "#e2f0e2",
  textMuted: "#6b8f6b",
  textSub: "#4a6b4a",
};

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const TEXT = {
  nav: {
    dashboard: { en: "Dashboard", hi: "डैशबोर्ड", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
    sensors: { en: "Sensors", hi: "सेंसर", kn: "ಸೆನ್ಸಾರ್‌ಗಳು" },
    irrigation: { en: "Irrigation Control", hi: "सिंचाई नियंत्रण", kn: "ನೀರಾವರಿ ನಿಯಂತ್ರಣ" },
    pump: { en: "Pump & Lighting", hi: "पंप और लाइट", kn: "ಪಂಪ್ ಮತ್ತು ಬೆಳಕು" },
    map: { en: "Farm Map", hi: "खेत का मानचित्र", kn: "ಫಾರ್ಮ್ ನಕ್ಷೆ" },
    alerts: { en: "Alerts", hi: "अलर्ट", kn: "ಎಚ್ಚರಿಕೆಗಳು" },
    analytics: { en: "Analytics", hi: "विश्लेषण", kn: "ವಿಶ್ಲೇಷಣೆ" },
    logs: { en: "Data Logs", hi: "डेटा लॉग", kn: "ಡೇಟಾ ದಾಖಲೆಗಳು" },
    device: { en: "Device Status", hi: "डिवाइस स्थिति", kn: "ಉಪಕರಣ ಸ್ಥಿತಿ" },
    syslog: { en: "System Logs", hi: "सिस्टम लॉग", kn: "ಸಿಸ್ಟಮ್ ದಾಖಲೆಗಳು" },
    settings: { en: "Settings", hi: "सेटिंग्स", kn: "ಸಂಯೋಜನೆಗಳು" },
    admin: { en: "Admin Panel", hi: "एडमिन पैनल", kn: "ನಿರ್ವಹಣಾ ಪ್ಯಾನೆಲ್" },
    logout: { en: "Logout", hi: "लॉगआउट", kn: "ಲಾಗ್‌ಔಟ್" },
  },
  pages: {
    farmOverviewTitle: {
      en: "Farm Overview",
      hi: "फार्म का सारांश",
      kn: "ಫಾರ್ಮ್ ಅವಲೋಕನ",
    },
    farmOverviewSubtitle: {
      en: "Real-time agricultural monitoring",
      hi: "रीयल-टाइम कृषि निगरानी",
      kn: "ರಿಯಲ್-ಟೈಮ್ ಕೃಷಿ ಮಾನಿಟರಿಂಗ್",
    },
    analyticsTitle: {
      en: "Analytics",
      hi: "विश्लेषण",
      kn: "ವಿಶ್ಲೇಷಣೆ",
    },
    analyticsAllDevices: {
      en: "Showing all devices",
      hi: "सभी डिवाइस दिखाए जा रहे हैं",
      kn: "ಎಲ್ಲ ಉಪಕರಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ",
    },
    irrigationTitle: {
      en: "Automatic Irrigation Control",
      hi: "स्वचालित सिंचाई नियंत्रण",
      kn: "ಸ್ವಯಂ ನೀರಾವರಿ ನಿಯಂತ್ರಣ",
    },
    pumpTitle: {
      en: "Pump & Lighting Control",
      hi: "पंप और लाइटिंग नियंत्रण",
      kn: "ಪಂಪ್ ಮತ್ತು ಬೆಳಕು ನಿಯಂತ್ರಣ",
    },
    sensorsTitle: {
      en: "Sensor Nodes",
      hi: "सेंसर नोड्स",
      kn: "ಸೆನ್ಸಾರ್ ನೋಡ್‌ಗಳು",
    },
    sensorsSubtitle: {
      en: "Live readings from LoRa sensor nodes across the farm",
      hi: "पूरे खेत में LoRa सेंसर नोड्स से लाइव रीडिंग",
      kn: "ಫಾರ್ಮ್‌ನಾದ್ಯಂತ ಲೋರಾ ಸೆನ್ಸಾರ್ ನೋಡ್‌ಗಳಿಂದ ಲೈವ್ ರೀಡಿಂಗ್‌ಗಳು",
    },
    mapTitle: {
      en: "Farm Map",
      hi: "खेत का मानचित्र",
      kn: "ಫಾರ್ಮ್ ನಕ್ಷೆ",
    },
    alertsTitle: {
      en: "Alerts & Notifications",
      hi: "अलर्ट और सूचनाएँ",
      kn: "ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ತಿಳಿವುಗಳು",
    },
    alertsSubtitle: {
      en: "System alerts triggered by sensor threshold violations",
      hi: "सेंसर की सीमा पार होने पर उत्पन्न होने वाले सिस्टम अलर्ट",
      kn: "ಸೆನ್ಸಾರ್ ಗಡಿಯನ್ನು ಮೀರುವಾಗ ಉಂಟಾಗುವ ಸಿಸ್ಟಮ್ ಎಚ್ಚರಿಕೆಗಳು",
    },
    alertsCriticalBadge: {
      en: "CRITICAL",
      hi: "गंभीर",
      kn: "ಗಂಭೀರ",
    },
    severityHigh: {
      en: "High",
      hi: "उच्च",
      kn: "ಹೆಚ್ಚು",
    },
    severityMedium: {
      en: "Medium",
      hi: "मध्यम",
      kn: "ಮಧ್ಯಮ",
    },
    severityLow: {
      en: "Low",
      hi: "कम",
      kn: "ಕಡಿಮೆ",
    },
    labelDevice: {
      en: "Device",
      hi: "डिवाइस",
      kn: "ಉಪಕರಣ",
    },
    labelValue: {
      en: "Value",
      hi: "मान",
      kn: "ಮೌಲ್ಯ",
    },
    labelThreshold: {
      en: "Threshold",
      hi: "सीमा",
      kn: "ಮಿತಿ",
    },
    alertTypeLowSoil: {
      en: "Low Soil Moisture",
      hi: "कम मिट्टी नमी",
      kn: "ಕಡಿಮೆ ಮಣ್ಣಿನ ತೇವಾಂಶ",
    },
    alertTypeHighTemp: {
      en: "High Temperature",
      hi: "अधिक तापमान",
      kn: "ಹೆಚ್ಚಿನ ತಾಪಮಾನ",
    },
    alertTypeNodeOffline: {
      en: "Node Offline",
      hi: "नोड ऑफलाइन",
      kn: "ನೋಡ್ ಆಫ್‌ಲೈನ್",
    },
    alertTypeLowBattery: {
      en: "Low Battery",
      hi: "कम बैटरी",
      kn: "ಕಡಿಮೆ ಬ್ಯಾಟರಿ",
    },
    timeYesterday: {
      en: "Yesterday",
      hi: "कल",
      kn: "ನಿನ್ನೆ",
    },
  },
};

const t = (group, key, lang) =>
  (TEXT[group] && TEXT[group][key] && TEXT[group][key][lang]) ||
  (TEXT[group] && TEXT[group][key] && TEXT[group][key].en) ||
  key;

// ─── Data Simulation ────────────────────────────────────────────────────────
const generateHistory = (base, variance, count = 48) =>
  Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.now() - (count - i) * 30 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: Math.max(0, base + (Math.random() - 0.5) * variance * 2),
  }));

const NODES_INIT = [
  { id: "NODE-01", lat: 14.6, lng: 75.9, name: "Field A – North", battery: 87, signal: -72 },
  { id: "NODE-02", lat: 14.58, lng: 75.92, name: "Field B – East", battery: 62, signal: -85 },
  { id: "NODE-03", lat: 14.62, lng: 75.88, name: "Field C – West", battery: 95, signal: -65 },
  { id: "NODE-04", lat: 14.59, lng: 75.91, name: "Field D – South", battery: 41, signal: -91 },
  { id: "NODE-05", lat: 14.61, lng: 75.93, name: "Greenhouse", battery: 78, signal: -70 },
];

const ALERTS_INIT = [
  { id: 1, type: "low_soil", nodeId: "NODE-02", value: "18%", threshold: "25%", time: "10:42 AM", severity: "high" },
  { id: 2, type: "high_temp", nodeId: "NODE-04", value: "38.2°C", threshold: "35°C", time: "09:15 AM", severity: "medium" },
  { id: 3, type: "node_offline", nodeId: "NODE-04", value: "–", threshold: "–", time: "08:50 AM", severity: "high" },
  { id: 4, type: "low_battery", nodeId: "NODE-04", value: "41%", threshold: "40%", time: "08:20 AM", severity: "low" },
  { id: 5, type: "low_soil", nodeId: "NODE-01", value: "22%", threshold: "25%", time: "yesterday", severity: "medium" },
];

const LOGS_INIT = [
  { time: "10:45 AM", event: "Sensor data received from NODE-01", type: "data" },
  { time: "10:44 AM", event: "Pump automatically activated – soil moisture below threshold", type: "pump" },
  { time: "10:42 AM", event: "Alert triggered: Low Soil Moisture on NODE-02", type: "alert" },
  { time: "10:30 AM", event: "Manual pump control: STOP by admin", type: "manual" },
  { time: "10:15 AM", event: "NODE-03 connected to gateway", type: "connect" },
  { time: "10:12 AM", event: "Sensor data received from NODE-03", type: "data" },
  { time: "09:58 AM", event: "Alert triggered: High Temperature on NODE-04", type: "alert" },
  { time: "09:30 AM", event: "NODE-04 disconnected", type: "connect" },
  { time: "09:15 AM", event: "Automatic irrigation stopped – moisture above max threshold", type: "pump" },
];

// ─── Utility Components ─────────────────────────────────────────────────────
export const Icon = ({ name, size = 20, color = C.green }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    sensors: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4" /><path d="M17.7 6.3a8 8 0 0 1 0 11.4" /><path d="M3.5 3.5a14 14 0 0 0 0 17" /><path d="M20.5 3.5a14 14 0 0 1 0 17" /></svg>,
    irrigation: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M12 2C6 9 4 12 4 15a8 8 0 0 0 16 0c0-3-2-6-8-13z" /><path d="M12 12v6" /></svg>,
    pump: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><path d="m4.9 4.9 2.1 2.1M16.9 16.9l2.2 2.2M4.9 19.1l2.1-2.1M16.9 7.1l2.2-2.2" /></svg>,
    map: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>,
    alerts: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M10.3 3.5a2 2 0 0 1 3.4 0l7.3 12.5A2 2 0 0 1 19.3 19H4.7a2 2 0 0 1-1.7-3L10.3 3.5z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    analytics: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    logs: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
    device: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
    syslog: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    temp: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>,
    moisture: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M12 2C6 9 4 12 4 15a8 8 0 0 0 16 0c0-3-2-6-8-13z" /></svg>,
    humidity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><line x1="8" y1="19" x2="8" y2="21" /><line x1="8" y1="13" x2="8" y2="15" /><line x1="16" y1="19" x2="16" y2="21" /><line x1="16" y1="13" x2="16" y2="15" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="12" y1="15" x2="12" y2="17" /><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" /></svg>,
    light: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
    menu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    leaf: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  };
  return icons[name] || null;
};

const Badge = ({ label, color = C.green }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{label}</span>
);

const StatusDot = ({ online }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: online ? C.green : C.red }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? C.green : C.red, boxShadow: online ? `0 0 6px ${C.green}` : "none", display: "inline-block" }} />
    {online ? "Online" : "Offline"}
  </span>
);

const MetricCard = ({ icon, label, value, unit, color = C.green, trend, sub }) => (
  <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.06, transform: "scale(2.5)" }}><Icon name={icon} size={64} color={color} /></div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={18} color={color} />
      <span style={{ color: C.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ color, fontSize: 32, fontWeight: 800, fontFamily: "'Courier New', monospace", letterSpacing: -1 }}>{value}</span>
      <span style={{ color: C.textMuted, fontSize: 14 }}>{unit}</span>
    </div>
    {sub && <div style={{ color: C.textSub, fontSize: 11 }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ color: trend >= 0 ? C.green : C.red, fontSize: 11, fontWeight: 600 }}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)} from last hour
      </div>
    )}
  </div>
);

const Btn = ({ label, onClick, color = C.green, outline, icon, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      background: outline ? "transparent" : color + "22",
      color: disabled ? C.textSub : color,
      border: `1.5px solid ${disabled ? C.textSub : color}`,
      borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 0.5, display: "inline-flex", alignItems: "center", gap: 6,
      transition: "all .15s", opacity: disabled ? 0.5 : 1,
    }}>
    {icon && <Icon name={icon} size={14} color={disabled ? C.textSub : color} />}
    {label}
  </button>
);

// ─── Mini Sparkline ─────────────────────────────────────────────────────────
const Spark = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={50}>
    <AreaChart data={data.slice(-20)} margin={{ top: 2, bottom: 2 }}>
      <defs><linearGradient id={`g${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
        <stop offset="95%" stopColor={color} stopOpacity={0} />
      </linearGradient></defs>
      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#g${color.replace("#", "")})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);


// ─── Pages ──────────────────────────────────────────────────────────────────

const PageDashboard = ({ state, dispatch, lang }) => {
  const { sensors, pump, lights, nodes } = state;
  const onlineNodes = nodes.filter(n => n.online).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
            {t("pages", "farmOverviewTitle", lang)}
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>
            {t("pages", "farmOverviewSubtitle", lang)} · Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge label={`${onlineNodes}/${nodes.length} NODES ACTIVE`} color={C.green} />
          <Badge label="LORA GATEWAY ●" color={C.blue} />
        </div>
      </div>

      {/* System Status Bar */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "12px 20px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { label: "Pump", value: pump ? "RUNNING" : "IDLE", color: pump ? C.green : C.textMuted },
          { label: "Lights", value: lights ? "ON" : "OFF", color: lights ? C.amber : C.textMuted },
          { label: "Active Nodes", value: `${onlineNodes} / ${nodes.length}`, color: C.blue },
          { label: "Avg Temp", value: onlineNodes > 0 ? `${sensors.temp.toFixed(1)} °C` : "–", color: C.amber },
          { label: "Avg Moisture", value: onlineNodes > 0 ? `${sensors.moisture.toFixed(1)} %` : "–", color: C.green },
          { label: "Avg Humidity", value: onlineNodes > 0 ? `${sensors.humidity.toFixed(1)} %` : "–", color: C.blue },
          { label: "Last Update", value: new Date().toLocaleTimeString(), color: C.textMuted },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: C.textSub, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ color: s.color, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Per-Device Sensor Cards */}
      {nodes.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "40px", textAlign: "center", color: C.textMuted }}>
          No devices registered. Add a device from the Admin panel to see live sensor data here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {nodes.map(node => {
            const temp = node.temperature ?? node.temp ?? null;
            const moisture = node.soil ?? node.moisture ?? null;
            const humidity = node.humidity ?? null;
            const rssi = node.rssi ?? node.signal ?? null;
            const hasData = temp !== null || moisture !== null || humidity !== null;

            return (
              <div key={node.id} style={{
                background: C.card,
                border: `1px solid ${node.online ? C.green + "33" : C.cardBorder}`,
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
                overflow: "hidden"
              }}>
                {/* Glow when online */}
                {node.online && <div style={{ position: "absolute", top: -30, right: -30, width: 80, height: 80, background: C.green, filter: "blur(40px)", opacity: 0.06, borderRadius: "50%" }} />}

                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.green, fontWeight: 800, fontFamily: "monospace", fontSize: 13, letterSpacing: 0.5 }}>{node.id}</div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.name || node.id}</div>
                    {(node.location_name) && <div style={{ color: C.textSub, fontSize: 11, marginTop: 2 }}>📍 {node.location_name}</div>}
                  </div>
                  <StatusDot online={node.online} />
                </div>

                {/* Sensor Readings */}
                {hasData ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {temp !== null && (
                      <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ color: C.textSub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🌡 Temp</div>
                        <div style={{ color: parseFloat(temp) > 35 ? C.red : C.amber, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{parseFloat(temp).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}> °C</span></div>
                      </div>
                    )}
                    {moisture !== null && (
                      <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ color: C.textSub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>💧 Soil</div>
                        <div style={{ color: parseFloat(moisture) < 25 ? C.red : C.green, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{parseFloat(moisture).toFixed(0)}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}> %</span></div>
                      </div>
                    )}
                    {humidity !== null && (
                      <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ color: C.textSub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🌫 Humidity</div>
                        <div style={{ color: C.blue, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{parseFloat(humidity).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}> %</span></div>
                      </div>
                    )}
                    {rssi !== null && (
                      <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ color: C.textSub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📶 Signal</div>
                        <div style={{ color: rssi > -80 ? C.green : rssi > -95 ? C.amber : C.red, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{rssi}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}> dBm</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: C.surface, borderRadius: 8, padding: "14px", textAlign: "center", color: C.textSub, fontSize: 12 }}>
                    {node.online ? "⏳ Waiting for first reading..." : "📴 Device offline — no recent data"}
                  </div>
                )}

                {/* Last seen */}
                {node.last_update && (
                  <div style={{ color: C.textSub, fontSize: 11, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10 }}>
                    Last update: {new Date(node.last_update).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 22px" }}>
        <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: "0 0 16px", letterSpacing: 1, textTransform: "uppercase" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn label="Start Pump" icon="pump" color={C.green} onClick={() => dispatch({ type: "SET_PUMP", val: true })} disabled={pump} />
          <Btn label="Stop Pump" icon="pump" color={C.red} onClick={() => dispatch({ type: "SET_PUMP", val: false })} disabled={!pump} />
          <Btn label="Lights ON" icon="light" color={C.amber} onClick={() => dispatch({ type: "SET_LIGHTS", val: true })} disabled={lights} />
          <Btn label="Lights OFF" icon="light" color={C.textMuted} onClick={() => dispatch({ type: "SET_LIGHTS", val: false })} disabled={!lights} />
        </div>
        {pump && <div style={{ marginTop: 10, color: C.green, fontSize: 12 }}>● Borewell pump is currently running – irrigation active</div>}
      </div>
    </div>
  );
};



const PageSensors = ({ state, lang }) => {
  const nodeData = useMemo(() => state.nodes.map((n, i) => ({
    ...n,
    temp: n.temperature !== undefined ? n.temperature : (28 + i * 1.3 + Math.random() * 2).toFixed(1),
    moisture: n.soil !== undefined ? n.soil : (22 + i * 4 - Math.random() * 3).toFixed(1),
    humidity: n.humidity !== undefined ? n.humidity : (60 + i * 2 + Math.random() * 5).toFixed(1),
    light: n.light !== undefined ? n.light : Math.round(3200 + i * 400 - Math.random() * 300),
    lastTx: n.last_update ? new Date(n.last_update).toLocaleTimeString() : new Date(Date.now() - i * 4 * 60000).toLocaleTimeString(),
  })), [state.nodes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
        {t("pages", "sensorsTitle", lang)}
      </h1>
      <p style={{ color: C.textMuted, fontSize: 13, margin: "-12px 0 0" }}>
        {t("pages", "sensorsSubtitle", lang)} ({state.nodes.length})
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              {["Node ID", "Soil Moisture", "Temperature", "Humidity", "Light (lux)", "Last TX", "Status"].map(h => (
                <th key={h} style={{ color: C.textSub, fontSize: 11, letterSpacing: 1, textAlign: "left", padding: "10px 14px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodeData.map((n, i) => (
              <tr key={n.id} style={{ borderBottom: `1px solid ${C.cardBorder}`, background: i % 2 === 0 ? "transparent" : C.card + "88" }}>
                <td style={{ padding: "12px 14px", color: C.green, fontWeight: 700, fontFamily: "monospace" }}>{n.name || n.id}</td>
                <td style={{ padding: "12px 14px", color: C.text }}>
                  <span style={{ color: parseFloat(n.moisture) < 25 ? C.red : C.green }}>{n.moisture}%</span>
                </td>
                <td style={{ padding: "12px 14px", color: C.text }}>
                  <span style={{ color: parseFloat(n.temp) > 35 ? C.red : C.amber }}>{n.temp}°C</span>
                </td>
                <td style={{ padding: "12px 14px", color: C.blue }}>{n.humidity}%</td>
                <td style={{ padding: "12px 14px", color: "#a78bfa" }}>{n.light}</td>
                <td style={{ padding: "12px 14px", color: C.textMuted, fontFamily: "monospace", fontSize: 12 }}>{n.lastTx}</td>
                <td style={{ padding: "12px 14px" }}><StatusDot online={n.online} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PageIrrigation = ({ state, dispatch, lang }) => {
  const { autoMode, minMoisture, maxMoisture, pump } = state;
  const [localMin, setLocalMin] = useState(minMoisture);
  const [localMax, setLocalMax] = useState(maxMoisture);

  const save = () => {
    dispatch({ type: "SET_THRESHOLDS", min: parseFloat(localMin), max: parseFloat(localMax) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
        {t("pages", "irrigationTitle", lang)}
      </h1>

      {/* Auto Mode Toggle */}
      <div style={{ background: C.card, border: `1px solid ${autoMode ? C.green + "66" : C.cardBorder}`, borderRadius: 12, padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Automatic Mode</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>System will auto-control the pump based on soil moisture thresholds</div>
        </div>
        <button onClick={() => dispatch({ type: "TOGGLE_AUTO" })}
          style={{ background: autoMode ? C.green + "33" : C.card, border: `2px solid ${autoMode ? C.green : C.textSub}`, borderRadius: 30, padding: "8px 20px", color: autoMode ? C.green : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .2s", letterSpacing: 0.5 }}>
          {autoMode ? "● AUTO MODE ON" : "○ AUTO MODE OFF"}
        </button>
      </div>

      {/* Thresholds */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 22px" }}>
        <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>Moisture Thresholds</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 420 }}>
          <div>
            <label style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Min (Pump ON below)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={localMin} onChange={e => setLocalMin(e.target.value)} min={0} max={100}
                style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "8px 12px", color: C.green, fontSize: 16, fontWeight: 700, fontFamily: "monospace", width: 80, outline: "none" }} />
              <span style={{ color: C.textMuted }}>%</span>
            </div>
          </div>
          <div>
            <label style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Max (Pump OFF above)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={localMax} onChange={e => setLocalMax(e.target.value)} min={0} max={100}
                style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "8px 12px", color: C.green, fontSize: 16, fontWeight: 700, fontFamily: "monospace", width: 80, outline: "none" }} />
              <span style={{ color: C.textMuted }}>%</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn label="Save Thresholds" color={C.green} onClick={save} />
        </div>
      </div>

      {/* Logic Display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 600 }}>
        <div style={{ background: C.card, border: `1px solid ${C.red}33`, borderRadius: 10, padding: 16 }}>
          <div style={{ color: C.red, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pump ON Condition</div>
          <div style={{ color: C.text, fontFamily: "monospace", fontSize: 13 }}>Moisture &lt; <span style={{ color: C.green }}>{state.minMoisture}%</span></div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>Current: <span style={{ color: C.green }}>{state.sensors.moisture.toFixed(1)}%</span>
            {state.sensors.moisture < state.minMoisture && <span style={{ color: C.red }}> · CONDITION MET</span>}
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.green}33`, borderRadius: 10, padding: 16 }}>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pump OFF Condition</div>
          <div style={{ color: C.text, fontFamily: "monospace", fontSize: 13 }}>Moisture &gt; <span style={{ color: C.amber }}>{state.maxMoisture}%</span></div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>Current: <span style={{ color: C.green }}>{state.sensors.moisture.toFixed(1)}%</span>
            {state.sensors.moisture > state.maxMoisture && <span style={{ color: C.amber }}> · CONDITION MET</span>}
          </div>
        </div>
      </div>

      {/* Gauge */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 22px" }}>
        <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Current Soil Moisture</div>
        <div style={{ position: "relative", height: 18, background: C.surface, borderRadius: 9, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: `${state.minMoisture}%`, top: 0, bottom: 0, width: 2, background: C.red, zIndex: 2 }} />
          <div style={{ position: "absolute", left: `${state.maxMoisture}%`, top: 0, bottom: 0, width: 2, background: C.amber, zIndex: 2 }} />
          <div style={{ height: "100%", width: `${state.sensors.moisture}%`, background: `linear-gradient(90deg, ${C.green}88, ${C.green})`, borderRadius: 9, transition: "width 1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textSub, marginTop: 4 }}>
          <span>0%</span><span style={{ color: C.red }}>▲ Min {state.minMoisture}%</span><span style={{ color: C.amber }}>▲ Max {state.maxMoisture}%</span><span>100%</span>
        </div>
        <div style={{ marginTop: 10, color: C.green, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>{state.sensors.moisture.toFixed(1)}%</div>
        <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Pump Status: <span style={{ color: pump ? C.green : C.textMuted, fontWeight: 700 }}>{pump ? "RUNNING" : "IDLE"}</span></div>
      </div>
    </div>
  );
};

const PagePump = ({ state, dispatch, lang }) => {
  const { pump, lights } = state;
  const runningSince = useMemo(() => new Date(Date.now() - 8 * 60000).toLocaleTimeString(), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
        {t("pages", "pumpTitle", lang)}
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 700 }}>
        {/* Pump */}
        <div style={{ background: C.card, border: `1px solid ${pump ? C.green + "55" : C.cardBorder}`, borderRadius: 14, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${pump ? C.green : C.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", background: pump ? C.green + "22" : "transparent", boxShadow: pump ? `0 0 24px ${C.green}44` : "none", transition: "all .3s" }}>
            <Icon name="pump" size={32} color={pump ? C.green : C.textSub} />
          </div>
          <div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>Borewell Pump</div>
            <div style={{ color: pump ? C.green : C.textMuted, fontSize: 13, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>● {pump ? "RUNNING" : "IDLE"}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Btn label="Start" color={C.green} onClick={() => dispatch({ type: "SET_PUMP", val: true })} disabled={pump} />
            <Btn label="Stop" color={C.red} onClick={() => dispatch({ type: "SET_PUMP", val: false })} disabled={!pump} />
          </div>
          {pump && <div style={{ color: C.textMuted, fontSize: 11 }}>Running since {runningSince}</div>}
        </div>
        {/* Lights */}
        <div style={{ background: C.card, border: `1px solid ${lights ? C.amber + "55" : C.cardBorder}`, borderRadius: 14, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${lights ? C.amber : C.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", background: lights ? C.amber + "22" : "transparent", boxShadow: lights ? `0 0 24px ${C.amber}44` : "none", transition: "all .3s" }}>
            <Icon name="light" size={32} color={lights ? C.amber : C.textSub} />
          </div>
          <div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>Field Lighting</div>
            <div style={{ color: lights ? C.amber : C.textMuted, fontSize: 13, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>● {lights ? "ON" : "OFF"}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Btn label="Turn ON" color={C.amber} onClick={() => dispatch({ type: "SET_LIGHTS", val: true })} disabled={lights} />
            <Btn label="Turn OFF" color={C.textMuted} onClick={() => dispatch({ type: "SET_LIGHTS", val: false })} disabled={!lights} />
          </div>
        </div>
      </div>
      {/* Command Log */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Recent Commands</div>
        {[
          { t: "10:44 AM", msg: "Pump started via Auto Irrigation", by: "system" },
          { t: "10:30 AM", msg: "Pump stopped manually", by: "admin" },
          { t: "10:00 AM", msg: "Lights turned OFF", by: "admin" },
          { t: "06:00 AM", msg: "Lights turned ON", by: "schedule" },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 12, borderBottom: `1px solid ${C.cardBorder}`, padding: "8px 0", fontSize: 13 }}>
            <span style={{ color: C.textSub, fontFamily: "monospace", fontSize: 11, minWidth: 70 }}>{l.t}</span>
            <span style={{ color: C.text, flex: 1 }}>{l.msg}</span>
            <Badge label={l.by} color={l.by === "system" ? C.green : l.by === "schedule" ? C.blue : C.amber} />
          </div>
        ))}
      </div>
    </div>
  );
};

// PageMap removed in favor of GPSMap component

const PageAlerts = ({ lang }) => {
  const sevColor = s => s === "high" ? C.red : s === "medium" ? C.amber : C.blue;

  const severityLabel = (severity) => {
    if (severity === "high") return t("pages", "severityHigh", lang);
    if (severity === "medium") return t("pages", "severityMedium", lang);
    if (severity === "low") return t("pages", "severityLow", lang);
    return severity;
  };

  const alertTypeLabel = (type) => {
    if (type === "low_soil") return t("pages", "alertTypeLowSoil", lang);
    if (type === "high_temp") return t("pages", "alertTypeHighTemp", lang);
    if (type === "node_offline") return t("pages", "alertTypeNodeOffline", lang);
    if (type === "low_battery") return t("pages", "alertTypeLowBattery", lang);
    return type;
  };

  const timeLabel = (time) => {
    if (time.toLowerCase() === "yesterday") return t("pages", "timeYesterday", lang);
    return time;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
            {t("pages", "alertsTitle", lang)}
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>
            {t("pages", "alertsSubtitle", lang)}
          </p>
        </div>
        <Badge
          label={`${ALERTS_INIT.filter(a => a.severity === "high").length} ${t("pages", "alertsCriticalBadge", lang)}`}
          color={C.red}
        />
      </div>
      {ALERTS_INIT.map(a => (
        <div key={a.id} style={{ background: C.card, border: `1px solid ${sevColor(a.severity)}33`, borderLeft: `3px solid ${sevColor(a.severity)}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ marginTop: 2 }}><Icon name="alerts" size={18} color={sevColor(a.severity)} /></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: sevColor(a.severity), fontWeight: 700, fontSize: 14 }}>
              {alertTypeLabel(a.type)}
            </div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>
              {t("pages", "labelDevice", lang)}:{" "}
              <span style={{ color: C.green, fontFamily: "monospace" }}>{a.nodeId}</span>{" "}
              · {t("pages", "labelValue", lang)}:{" "}
              <span style={{ color: C.text }}>{a.value}</span>{" "}
              · {t("pages", "labelThreshold", lang)}:{" "}
              <span style={{ color: C.textMuted }}>{a.threshold}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Badge label={severityLabel(a.severity)} color={sevColor(a.severity)} />
            <span style={{ color: C.textSub, fontSize: 11, fontFamily: "monospace" }}>
              {timeLabel(a.time)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};


// ─── Device colour palette ───────────────────────────────────────────────────
const DEVICE_COLORS = ["#4ade80","#60a5fa","#fbbf24","#f87171","#a78bfa","#34d399","#fb923c","#e879f9","#22d3ee","#f9a8d4"];

// ─── Multi-line chart (All Devices) ─────────────────────────────────────────
const MultiLineChart = ({ allDeviceData, metric, label, unit, deviceNames, colors }) => {
  // Merge all timestamps across devices
  const timeSet = new Set();
  Object.values(allDeviceData).forEach(rows => rows.forEach(r => timeSet.add(r.time)));
  const sortedTimes = [...timeSet].sort();

  const chartData = sortedTimes.map(t => {
    const point = { time: t };
    Object.entries(allDeviceData).forEach(([devId, rows]) => {
      const match = rows.find(r => r.time === t);
      if (match && match[metric] !== null && match[metric] !== undefined) {
        point[devId] = Number(match[metric]);
      }
    });
    return point;
  });

  // Global min/max/avg for this metric across all devices
  const allValues = Object.values(allDeviceData)
    .flatMap(rows => rows.map(r => r[metric]))
    .filter(v => v !== null && v !== undefined)
    .map(Number);

  const minVal = allValues.length ? Math.min(...allValues) : null;
  const maxVal = allValues.length ? Math.max(...allValues) : null;
  const avgVal = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : null;

  const deviceIds = Object.keys(allDeviceData);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "18px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          {label} — All Devices
        </div>
        {avgVal !== null && (
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            <span style={{ color: C.red }}>▼ Min: {minVal.toFixed(1)}{unit}</span>
            <span style={{ color: C.green }}>Avg: {avgVal.toFixed(1)}{unit}</span>
            <span style={{ color: C.amber }}>▲ Max: {maxVal.toFixed(1)}{unit}</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={C.cardBorder} strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fill: C.textSub, fontSize: 10 }} interval={Math.max(1, Math.floor(sortedTimes.length / 6))} />
          <YAxis tick={{ fill: C.textSub, fontSize: 10 }} unit={unit} width={40} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, color: C.text, fontSize: 12 }}
            formatter={(v, key) => [`${Number(v).toFixed(1)} ${unit}`, deviceNames[key] || key]} />
          <Legend formatter={key => <span style={{ color: C.textMuted, fontSize: 11 }}>{deviceNames[key] || key}</span>} />
          {deviceIds.map((devId, i) => (
            <Line key={devId} type="monotone" dataKey={devId} stroke={colors[i % colors.length]}
              strokeWidth={2} dot={false} connectNulls />
          ))}
          {minVal !== null && (
            <ReferenceLine
              y={minVal}
              stroke={C.red}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Min ${minVal.toFixed(1)}`, fill: C.red, fontSize: 10, position: "insideTopLeft" }}
            />
          )}
          {maxVal !== null && (
            <ReferenceLine
              y={maxVal}
              stroke={C.amber}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Max ${maxVal.toFixed(1)}`, fill: C.amber, fontSize: 10, position: "insideBottomLeft" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Single device chart with min/max lines ──────────────────────────────────
const SingleDeviceChart = ({ data, metric, label, unit, color }) => {
  const values = data.map(r => r[metric]).filter(v => v !== null && v !== undefined).map(Number);
  const minVal = values.length ? Math.min(...values) : null;
  const maxVal = values.length ? Math.max(...values) : null;
  const avgVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const chartData = data.map(r => ({
    time: r.time,
    value: r[metric] !== null && r[metric] !== undefined ? Number(r[metric]) : null
  }));

  const gradId = `sdg${color.replace("#", "")}`;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "18px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
        {avgVal !== null && (
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            <span style={{ color: C.red }}>▼ Min: {minVal.toFixed(1)}{unit}</span>
            <span style={{ color: C.green }}>Avg: {avgVal.toFixed(1)}{unit}</span>
            <span style={{ color: C.amber }}>▲ Max: {maxVal.toFixed(1)}{unit}</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 10, right: 24, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.cardBorder} strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fill: C.textSub, fontSize: 10 }} interval={Math.max(1, Math.floor(chartData.length / 6))} />
          <YAxis tick={{ fill: C.textSub, fontSize: 10 }} unit={unit} width={40} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, color: C.text, fontSize: 12 }}
            formatter={v => v !== null ? [`${Number(v).toFixed(1)} ${unit}`, label] : ["No data", label]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} connectNulls />
          {minVal !== null && (
            <ReferenceLine y={minVal} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Min ${minVal.toFixed(1)}`, fill: C.red, fontSize: 10, position: "insideTopLeft" }} />
          )}
          {maxVal !== null && (
            <ReferenceLine y={maxVal} stroke={C.amber} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Max ${maxVal.toFixed(1)}`, fill: C.amber, fontSize: 10, position: "insideBottomLeft" }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Analytics Page ──────────────────────────────────────────────────────────
const PageAnalytics = ({ apiFetch, state, demoMode, selectedDeviceId, lang }) => {
  const [filter, setFilter] = useState("24h");
  const [selectedDevice, setSelectedDevice] = useState("all"); // "all" or device id
  const [deviceHistories, setDeviceHistories] = useState({}); // { [devId]: [{time,temp,humidity,moisture,rssi}] }
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(true);

  const filters = [
    { key: "1h",  label: "Last Hour" },
    { key: "6h",  label: "6 Hours" },
    { key: "24h", label: "24 Hours" },
    { key: "7d",  label: "7 Days" },
    { key: "30d", label: "30 Days" },
  ];

  const nodes = state.nodes;

  // Stable string key for the set of nodes — only changes when device list actually changes
  const nodeIdsKey = nodes.map(n => n.id).join(",");

  // Build device name map — only recomputes when the ID list changes
  const deviceNames = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = n.name || n.id; });
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdsKey]);

  // Stable key for the devices we need to fetch charts for
  const deviceIdsKey = selectedDevice === "all" ? nodeIdsKey : selectedDevice;

  useEffect(() => {
    if (!selectedDeviceId) return;
    // Only update if the target device exists in current nodes
    if (nodes.some(n => n.id === selectedDeviceId)) {
      setSelectedDevice(selectedDeviceId);
    }
  }, [selectedDeviceId, nodes]);

  // Fetch chart data — only when filter/selection/device-list actually changes (NOT every poll)
  useEffect(() => {
    const deviceIds = selectedDevice === "all"
      ? nodeIdsKey.split(",").filter(Boolean)
      : [selectedDevice];

    if (deviceIds.length === 0 || (deviceIds.length === 1 && !deviceIds[0])) {
      setLoadingCharts(false);
      return;
    }

    let active = true;
    // Only show loading spinner on first load; silent refresh after
    setDeviceHistories(prev => {
      const hasData = Object.keys(prev).length > 0;
      if (!hasData) setLoadingCharts(true);
      return prev;
    });

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          deviceIds.map(devId =>
            apiFetch(`http://localhost:5000/api/history/${devId}?range=${filter}&limit=200`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          )
        );

        if (!active) return;

        const histories = {};
        deviceIds.forEach((devId, i) => {
          const rows = Array.isArray(results[i]) ? results[i] : [];
          histories[devId] = rows.map(r => ({
            time: new Date(r.created_at || r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date(r.created_at || r.time).getTime(),
            temp: r.temperature != null ? Number(r.temperature) : null,
            moisture: r.soil != null ? Number(r.soil) : null,
            humidity: r.humidity != null ? Number(r.humidity) : null,
            rssi: r.rssi != null ? Number(r.rssi) : null,
          }));
        });

        // Demo mode fallback — only used when real data is empty
        if (demoMode && Object.values(histories).every(h => h.length === 0)) {
          deviceIds.forEach((devId, idx) => {
            histories[devId] = Array.from({ length: 30 }, (_, i) => ({
              time: new Date(Date.now() - (29 - i) * 10 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              timestamp: Date.now() - (29 - i) * 10 * 60000,
              temp: 25 + idx + Math.sin(i / 5) * 4 + Math.random() * 2,
              moisture: 35 + idx * 5 + Math.cos(i / 4) * 10 + Math.random() * 5,
              humidity: 55 + idx * 3 + Math.sin(i / 6) * 8 + Math.random() * 3,
              rssi: -70 - idx * 5 + Math.random() * 10 - 5,
            }));
          });
        }

        setDeviceHistories(histories);
      } catch (err) {
        console.error("Failed to load chart data", err);
      }
      if (active) setLoadingCharts(false);
    };

    fetchAll();
    // Poll charts every 30s to avoid constant loading flash
    const iv = setInterval(fetchAll, 30000);
    return () => { active = false; clearInterval(iv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIdsKey, filter, demoMode]); // intentionally exclude apiFetch (stable per session)

  // Fetch table rows — uses a stable interval, NOT dependent on nodes object
  useEffect(() => {
    let active = true;
    const fetchTable = async () => {
      try {
        const res = await apiFetch("http://localhost:5000/api/json-data");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!active) return;
        const allReadings = [];
        if (data.devices) {
          Object.keys(data.devices).forEach(devId => {
            if (selectedDevice !== "all" && devId !== selectedDevice) return;
            // Use devId as name fallback (avoid depending on nodes object)
            const devName = deviceNames[devId] || devId;
            (data.devices[devId].readings || []).forEach(r => {
              allReadings.push({
                date: new Date(r.created_at).toLocaleDateString(),
                time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                timestamp: new Date(r.created_at).getTime(),
                node: devName,
                temp: r.temperature != null ? Number(r.temperature).toFixed(1) : "-",
                humidity: r.humidity != null ? Number(r.humidity).toFixed(1) : "-",
                moisture: r.soil != null ? Number(r.soil).toFixed(1) : "-",
              });
            });
          });
        }
        if (demoMode && allReadings.length === 0) {
          for (let i = 0; i < 12; i++) {
            allReadings.push({
              date: new Date().toLocaleDateString(),
              time: new Date(Date.now() - i * 15 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              timestamp: Date.now() - i * 15 * 60000,
              node: `Demo Node ${(i % 3) + 1}`,
              temp: (28 + Math.random() * 5).toFixed(1),
              humidity: (60 + Math.random() * 15).toFixed(1),
              moisture: (22 + Math.random() * 20).toFixed(1),
            });
          }
        }
        allReadings.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryRows(allReadings.slice(0, 20));
      } catch { /* ignore */ }
      if (active) setLoadingTable(false);
    };
    fetchTable();
    const iv = setInterval(fetchTable, 15000);
    return () => { active = false; clearInterval(iv); };
  }, [apiFetch, nodes, selectedDevice, demoMode]);

  // For "All Devices" multi-line charts
  const allDeviceData = deviceHistories; // { [devId]: rows }

  // For single device charts
  const singleDeviceData = selectedDevice !== "all" ? (deviceHistories[selectedDevice] || []) : [];

  const deviceColorMap = useMemo(() => {
    const m = {};
    nodes.forEach((n, i) => { m[n.id] = DEVICE_COLORS[i % DEVICE_COLORS.length]; });
    return m;
  }, [nodes]);

  const metrics = [
    { key: "temp",     label: "Temperature",   unit: "°C",  color: C.amber },
    { key: "moisture", label: "Soil Moisture",  unit: " %", color: C.green },
    { key: "humidity", label: "Humidity",       unit: " %", color: C.blue },
    { key: "rssi",     label: "Signal (RSSI)",  unit: " dB", color: "#a78bfa" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>
            {t("pages", "analyticsTitle", lang)}
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>
            {selectedDevice === "all"
              ? `${t("pages", "analyticsAllDevices", lang)} (${nodes.length})`
              : `Device: ${deviceNames[selectedDevice] || selectedDevice}`}
          </p>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

          {/* Device selector dropdown */}
          <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
            style={{ background: C.surface, color: C.green, border: `1.5px solid ${C.green}55`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, outline: "none", cursor: "pointer", minWidth: 180 }}>
            <option value="all">📊 All Devices</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>🔵 {n.name || n.id}</option>
            ))}
          </select>

          {/* Time range */}
          <div style={{ display: "flex", gap: 4, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 4 }}>
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ background: filter === f.key ? C.green + "33" : "transparent", border: filter === f.key ? `1px solid ${C.green}` : "1px solid transparent", borderRadius: 6, padding: "5px 12px", color: filter === f.key ? C.green : C.textMuted, fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all .15s" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {loadingCharts ? (
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "40px", textAlign: "center", color: C.textMuted }}>
          Loading chart data...
        </div>
      ) : nodes.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "40px", textAlign: "center", color: C.textSub }}>
          No devices found. Add a device in the Admin panel first.
        </div>
      ) : selectedDevice === "all" ? (
        // ── ALL DEVICES: multi-line charts ──
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {nodes.map((n, i) => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                <span style={{ color: C.text, fontWeight: 600 }}>{n.name || n.id}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16 }}>
            {metrics.slice(0, 3).map(m => (
              <MultiLineChart key={m.key}
                allDeviceData={allDeviceData}
                metric={m.key} label={m.label} unit={m.unit}
                deviceNames={deviceNames}
                colors={nodes.map((_, i) => DEVICE_COLORS[i % DEVICE_COLORS.length])}
              />
            ))}
          </div>
        </div>
      ) : (
        // ── SINGLE DEVICE: individual charts with min/max ──
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
          {metrics.map(m => (
            <SingleDeviceChart key={m.key}
              data={singleDeviceData}
              metric={m.key} label={m.label} unit={m.unit} color={m.color}
            />
          ))}
        </div>
      )}

      {/* Recent Read History Table */}
      <div>
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 14px", letterSpacing: 0.5 }}>
          Recent Readings {selectedDevice !== "all" && `— ${deviceNames[selectedDevice] || selectedDevice}`}
        </h3>
        <div style={{ overflowX: "auto", background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
          {loadingTable ? (
            <div style={{ padding: "30px", textAlign: "center", color: C.textMuted }}>Loading read history...</div>
          ) : historyRows.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: C.textSub }}>No historical data available</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.cardBorder}`, background: C.surface }}>
                  {["Date", "Time", "Node", "Temp (°C)", "Humidity (%)", "Moisture (%)"].map(h => (
                    <th key={h} style={{ color: C.textSub, fontSize: 11, letterSpacing: 1, textAlign: "left", padding: "12px 16px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i === historyRows.length - 1 ? "none" : `1px solid ${C.cardBorder}88`, background: i % 2 === 0 ? "transparent" : C.surface + "55" }}>
                    <td style={{ padding: "10px 16px", color: C.text, fontSize: 12 }}>{r.date}</td>
                    <td style={{ padding: "10px 16px", color: C.textMuted, fontFamily: "monospace", fontSize: 11 }}>{r.time}</td>
                    <td style={{ padding: "10px 16px", color: C.green, fontFamily: "monospace", fontWeight: 700 }}>{r.node}</td>
                    <td style={{ padding: "10px 16px", color: C.amber }}>{r.temp}</td>
                    <td style={{ padding: "10px 16px", color: C.blue }}>{r.humidity}</td>
                    <td style={{ padding: "10px 16px", color: C.green }}>{r.moisture}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};



const PageDataLogs = ({ apiFetch, state, demoMode }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let interval;
    
    const fetchData = async () => {
      try {
        const res = await apiFetch("http://localhost:5000/api/json-data");
        if (!res.ok) throw new Error("Could not fetch data");
        const data = await res.json();
        
        if (active) {
          const allReadings = [];
          
          const nodeMap = {};
          state.nodes.forEach(n => nodeMap[n.id] = n);

          if (data.devices) {
            Object.keys(data.devices).forEach(devId => {
               const devName = nodeMap[devId]?.name || devId;
               const readings = data.devices[devId].readings || [];
               readings.forEach(r => {
                 allReadings.push({
                   time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                   timestamp: new Date(r.created_at).getTime(),
                   node: devName,
                   temp: r.temperature !== null ? Number(r.temperature).toFixed(1) : "-",
                   humidity: r.humidity !== null ? Number(r.humidity).toFixed(1) : "-",
                   moisture: r.soil !== null ? Number(r.soil).toFixed(1) : "-",
                   light: r.light ?? "-",
                 });
               });
            });
          }

          if (demoMode && allReadings.length === 0) {
            for (let i = 0; i < 20; i++) {
              allReadings.push({
                time: new Date(Date.now() - i * 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                timestamp: Date.now() - i * 15 * 60000,
                node: `Demo Node ${(i % 5) + 1}`,
                temp: (28 + Math.random() * 5).toFixed(1),
                humidity: (60 + Math.random() * 15).toFixed(1),
                moisture: (22 + Math.random() * 20).toFixed(1),
                light: Math.round(2800 + Math.random() * 1200),
              });
            }
          }

          // Sort descending by timestamp
          allReadings.sort((a, b) => b.timestamp - a.timestamp);
          setRows(allReadings);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load records", err);
        if (active) setLoading(false);
      }
    };
    
    fetchData();
    interval = setInterval(fetchData, 10000); // Poll every 10s

    return () => { 
      active = false;
      clearInterval(interval);
    };
  }, [apiFetch, state.nodes, demoMode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>Data Logs</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>Historical sensor readings · {rows.length} records</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn label="Export CSV" icon="download" color={C.green} />
          <Btn label="Export PDF" icon="download" color={C.blue} />
        </div>
      </div>
      
      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: C.textMuted }}>Loading sensor history...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: C.textSub }}>No historical data available</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
                {["Timestamp", "Node ID", "Temp (°C)", "Humidity (%)", "Moisture (%)", "Light (lux)"].map(h => (
                  <th key={h} style={{ color: C.textSub, fontSize: 11, letterSpacing: 1, textAlign: "left", padding: "10px 14px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.cardBorder}88`, background: i % 2 === 0 ? "transparent" : C.card + "55" }}>
                  <td style={{ padding: "10px 14px", color: C.textMuted, fontFamily: "monospace", fontSize: 11 }}>{r.time}</td>
                  <td style={{ padding: "10px 14px", color: C.green, fontFamily: "monospace", fontWeight: 700 }}>{r.node}</td>
                  <td style={{ padding: "10px 14px", color: C.amber }}>{r.temp}</td>
                  <td style={{ padding: "10px 14px", color: C.blue }}>{r.humidity}</td>
                  <td style={{ padding: "10px 14px", color: C.green }}>{r.moisture}</td>
                  <td style={{ padding: "10px 14px", color: "#a78bfa" }}>{r.light}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const PageDeviceStatus = ({ state }) => {
  const nodesWithTime = useMemo(() => state.nodes.map((n, i) => ({
    ...n,
    lastData: new Date(Date.now() - i * 4 * 60000).toLocaleTimeString(),
    name: NODES_INIT[i]?.name
  })), [state.nodes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>Device Status</h1>
      <p style={{ color: C.textMuted, fontSize: 13, margin: "-12px 0 0" }}>Health monitoring for all LoRa sensor nodes</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {nodesWithTime.map(n => (
          <div key={n.id} style={{ background: C.card, border: `1px solid ${n.online ? C.green + "33" : C.red + "33"}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.green, fontWeight: 700, fontFamily: "monospace", fontSize: 14 }}>{n.id}</span>
              <StatusDot online={n.online} />
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{n.name}</div>
            <hr style={{ border: "none", borderTop: `1px solid ${C.cardBorder}` }} />
            {/* Battery */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.textSub, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Battery</span>
                <span style={{ color: n.battery > 50 ? C.green : n.battery > 25 ? C.amber : C.red, fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{n.battery}%</span>
              </div>
              <div style={{ height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${n.battery}%`, height: "100%", background: n.battery > 50 ? C.green : n.battery > 25 ? C.amber : C.red, borderRadius: 3 }} />
              </div>
            </div>
            {/* Signal */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textSub, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Signal (RSSI)</span>
              <span style={{ color: C.blue, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{n.signal} dBm</span>
            </div>
            <div style={{ color: C.textSub, fontSize: 11 }}>Last data: {n.lastData}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PageSystemLogs = () => {
  const typeColor = t => t === "pump" ? C.green : t === "alert" ? C.red : t === "manual" ? C.amber : t === "connect" ? C.blue : C.textMuted;
  const typeIcon = t => t === "pump" ? "pump" : t === "alert" ? "alerts" : t === "manual" ? "settings" : t === "connect" ? "sensors" : "syslog";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>System Logs</h1>
      <p style={{ color: C.textMuted, fontSize: 13, margin: "-12px 0 0" }}>Chronological log of all system events</p>
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
        {LOGS_INIT.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "12px 18px", borderBottom: `1px solid ${C.cardBorder}`, alignItems: "flex-start", background: i % 2 === 0 ? "transparent" : C.surface + "55" }}>
            <Icon name={typeIcon(l.type)} size={15} color={typeColor(l.type)} />
            <span style={{ color: C.textSub, fontFamily: "monospace", fontSize: 11, minWidth: 72 }}>{l.time}</span>
            <span style={{ color: C.text, fontSize: 13, flex: 1 }}>{l.event}</span>
            <Badge label={l.type.toUpperCase()} color={typeColor(l.type)} />
          </div>
        ))}
      </div>
    </div>
  );
};

const PageSettings = () => {
  const [name, setName] = useState("Green Valley Farm");
  const [email, setEmail] = useState("admin@krishisetu.in");
  const [interval, setInterval] = useState("30");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 600 }}>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Georgia', serif" }}>Settings</h1>
      {[
        { title: "Farm Details", fields: [{ label: "Farm Name", val: name, set: setName, type: "text" }, { label: "Admin Email", val: email, set: setEmail, type: "email" }] },
        { title: "Data Sync", fields: [{ label: "Sensor Poll Interval (sec)", val: interval, set: setInterval, type: "number" }] },
      ].map(section => (
        <div key={section.title} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 22px" }}>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: "0 0 16px", letterSpacing: 1, textTransform: "uppercase" }}>{section.title}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {section.fields.map(f => (
              <div key={f.label}>
                <label style={{ color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Btn label="Save Settings" color={C.green} icon="settings" />
    </div>
  );
};

// ─── App State & Backend Integration ──────────────────────────────────────────
const initState = () => ({
  sensors: { temp: 0, moisture: 0, humidity: 0, light: 0 },
  pump: false,
  lights: false,
  autoMode: true,
  minMoisture: 25,
  maxMoisture: 65,
  nodes: [],
  history: {
    temp: [],
    moisture: [],
    humidity: [],
    light: [],
  },
  alerts: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_PUMP": return { ...state, pump: action.val };
    case "SET_LIGHTS": return { ...state, lights: action.val };
    case "TOGGLE_AUTO": return { ...state, autoMode: !state.autoMode };
    case "SET_THRESHOLDS": return { ...state, minMoisture: action.min, maxMoisture: action.max };
    case "MERGE_LIVE_DATA": {
      const { devices, alerts, allData } = action.payload;

      // Calculate farm-wide averages for the dashboard
      let avgTemp = 0, avgMoist = 0, avgHum = 0, avgLight = 0, onlineCount = 0;

      const updatedNodes = devices.map(d => {
        const dData = allData[d.id];
        const isOnline = dData?.status === 'online';
        if (isOnline) {
          avgTemp += (dData.temperature || 0);
          avgMoist += (dData.soil || 0);
          avgHum += (dData.humidity || 0);
          avgLight += (dData.light || 4000); // Backwards compatibility if light missing
          onlineCount++;
        }
        return {
          id: d.id,
          name: d.name || `Node ${d.id}`,
          lat: d.latitude,
          lng: d.longitude,
          online: isOnline,
          battery: isOnline ? 100 : 0, // Mock battery if backend doesn't supply it natively yet
          signal: dData?.rssi || -100,
          ...dData // Spread native sensor properties inside
        };
      });

      if (onlineCount > 0) {
        avgTemp /= onlineCount;
        avgMoist /= onlineCount;
        avgHum /= onlineCount;
        avgLight /= onlineCount;
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const addPoint = (arr, val) => {
        if (arr.length > 0 && arr[arr.length - 1].time === timestamp) return arr; // prevent duplicate stamps in exact same minute
        return [...arr.slice(-49), { time: timestamp, value: val }];
      };

      // Evaluate local auto rules
      let pumpState = state.pump;
      if (state.autoMode && onlineCount > 0) {
        if (avgMoist < state.minMoisture) pumpState = true;
        if (avgMoist > state.maxMoisture) pumpState = false;
      }

      return {
        ...state,
        pump: pumpState,
        nodes: updatedNodes,
        alerts: alerts || state.alerts,
        sensors: {
          temp: avgTemp,
          moisture: avgMoist,
          humidity: avgHum,
          light: avgLight
        },
        history: {
          temp: addPoint(state.history.temp, avgTemp),
          moisture: addPoint(state.history.moisture, avgMoist),
          humidity: addPoint(state.history.humidity, avgHum),
          light: addPoint(state.history.light, avgLight),
        }
      };
    }
    default: return state;
  }
};

// ─── Root App ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "sensors", icon: "sensors", label: "Sensors" },
  { id: "irrigation", icon: "irrigation", label: "Irrigation Control" },
  { id: "pump", icon: "pump", label: "Pump & Lighting" },
  { id: "map", icon: "map", label: "Farm Map" },
  { id: "alerts", icon: "alerts", label: "Alerts" },
  { id: "analytics", icon: "analytics", label: "Analytics" },
  { id: "logs", icon: "logs", label: "Data Logs" },
  { id: "device", icon: "device", label: "Device Status" },
  { id: "syslog", icon: "syslog", label: "System Logs" },
  { id: "settings", icon: "settings", label: "Settings" },
  { id: "admin", icon: "settings", label: "Admin Panel" },
  { id: "logout", icon: "close", label: "Logout" },
];

function DashboardLayout({ token, setToken, userRole, apiFetch }) {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [state, dispatch] = useState(initState());
  const dispatchFn = useCallback((action) => dispatch(prev => reducer(prev, action)), []);
  const [selectedAnalyticsDevice, setSelectedAnalyticsDevice] = useState(null);

  // API Bootstrapping & Polling
  useEffect(() => {
    let interval;
    const fetchLiveData = async () => {
      try {
        const [devicesRes, alertsRes, dataRes] = await Promise.all([
          apiFetch("http://localhost:5000/api/devices"),
          apiFetch("http://localhost:5000/api/alerts/active"),
          demoMode ? Promise.resolve({ ok: true, json: () => ({}) }) : apiFetch("http://localhost:5000/api/all-devices-data")
        ]);

        if (devicesRes.ok && dataRes.ok) {
          const devices = await devicesRes.json();
          const alerts = alertsRes.ok ? await alertsRes.json() : [];
          let allData = await dataRes.json();

          if (demoMode) {
            allData = {};
            devices.forEach((device, idx) => {
              allData[device.id] = {
                soil: Math.max(10, Math.min(90, 35 + Math.floor(Math.random() * 20) - 10)),
                temperature: 25 + idx + Math.floor(Math.random() * 4) - 2,
                humidity: 50 + idx * 5 + Math.floor(Math.random() * 10) - 5,
                light: 4000 + Math.floor(Math.random() * 1000) - 500,
                rssi: -70 + Math.floor(Math.random() * 10) - 5,
                status: 'online'
              };
            });
          }

          dispatchFn({ type: "MERGE_LIVE_DATA", payload: { devices, alerts, allData } });
        } else if (devicesRes.status === 401 || devicesRes.status === 403) {
          setToken("");
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          window.location.href = "/";
        }
      } catch (err) {
        console.error("Failed to connect to backend", err);
      }
    };

    fetchLiveData(); // Initial fetch
    interval = setInterval(fetchLiveData, demoMode ? 3000 : 10000); // Poll faster in demo mode

    return () => clearInterval(interval);
  }, [apiFetch, dispatchFn, demoMode]);

  const alertCount = state.alerts.filter(a => a.severity === "high").length;

  const pageMap = {
    dashboard: <PageDashboard state={state} dispatch={dispatchFn} lang={lang} />,
    sensors: <PageSensors state={state} lang={lang} />,
    irrigation: <PageIrrigation state={state} dispatch={dispatchFn} lang={lang} />,
    pump: <PagePump state={state} dispatch={dispatchFn} lang={lang} />,
    map: (
      <GPSMap
        devices={state.nodes}
        selectedDevice={selectedAnalyticsDevice}
        lang={lang}
        onDeviceClick={(id) => {
          setSelectedAnalyticsDevice(id);
          setPage("analytics");
        }}
        onDeviceNameClick={(id) => {
          setSelectedAnalyticsDevice(id);
          setPage("analytics");
        }}
      />
    ),
    alerts: <PageAlerts state={state} lang={lang} />,
    analytics: (
      <PageAnalytics
        apiFetch={apiFetch}
        state={state}
        demoMode={demoMode}
        selectedDeviceId={selectedAnalyticsDevice}
        lang={lang}
      />
    ),
    logs: <PageDataLogs apiFetch={apiFetch} state={state} demoMode={demoMode} />,
    device: <PageDeviceStatus state={state} />,
    syslog: <PageSystemLogs />,
    settings: <PageSettings state={state} dispatch={dispatchFn} />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: C.text }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 230 : 56, minWidth: sidebarOpen ? 230 : 56, background: C.surface, borderRight: `1px solid ${C.cardBorder}`, display: "flex", flexDirection: "column", transition: "width .2s, min-width .2s", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ padding: "16px 14px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.cardBorder}`, minHeight: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.green + "22", border: `1.5px solid ${C.green}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="leaf" size={17} color={C.green} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ color: C.green, fontWeight: 800, fontSize: 14, letterSpacing: 0.5, fontFamily: "'Georgia', serif", whiteSpace: "nowrap" }}>Krishi Setu</div>
              <div style={{ color: C.textSub, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Smart Agri IoT</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(s => !s)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <Icon name={sidebarOpen ? "close" : "menu"} size={16} color={C.textMuted} />
          </button>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto", overflowX: "hidden" }}>
          {NAV.map(n => {
            if (n.id === "admin" && userRole !== "admin") return null;

            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => {
                if (n.id === "logout") {
                  setToken("");
                  localStorage.removeItem("token");
                  window.location.href = "/";
                } else if (n.id === "admin") {
                  window.location.href = "/admin";
                } else {
                  setPage(n.id);
                }
              }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarOpen ? "9px 14px" : "9px 0", justifyContent: sidebarOpen ? "flex-start" : "center", background: active ? C.green + "18" : "none", border: "none", borderLeft: `3px solid ${active ? C.green : "transparent"}`, cursor: "pointer", color: active ? C.green : C.textMuted, fontSize: 13, fontWeight: active ? 700 : 400, transition: "all .15s", position: "relative" }}>
                <span style={{ flexShrink: 0 }}><Icon name={n.icon} size={16} color={active ? C.green : C.textMuted} /></span>
                {sidebarOpen && (
                  <span style={{ whiteSpace: "nowrap" }}>
                    {t("nav", n.id, lang)}
                  </span>
                )}
                {n.id === "alerts" && alertCount > 0 && (
                  <span style={{ marginLeft: "auto", background: C.red, color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{alertCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.cardBorder}`, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: C.textSub, fontSize: 10, letterSpacing: 0.5 }}>v1.0 · LoRa Gateway</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}` }} />
                <span style={{ color: C.textMuted, fontSize: 10 }}>Gateway Online</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.textSub, fontSize: 10 }}>Language</span>
                <select
                  value={lang}
                  onChange={e => {
                    const v = e.target.value;
                    setLang(v);
                    localStorage.setItem("lang", v);
                  }}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    color: C.text,
                    fontSize: 10,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {LANGUAGE_OPTIONS.map(o => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setDemoMode(!demoMode)}
                style={{ background: demoMode ? C.amber + "22" : "transparent", color: demoMode ? C.amber : C.textMuted, border: `1px solid ${demoMode ? C.amber + "55" : C.cardBorder}`, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", transition: "all 0.2s" }}
              >
                {demoMode ? "Demo On" : "Demo Off"}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: "24px 28px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={() => setDemoMode(!demoMode)}
            style={{
              background: demoMode ? C.amber + "22" : "transparent",
              color: demoMode ? C.amber : C.textMuted,
              border: `1px solid ${demoMode ? C.amber + "55" : C.cardBorder}`,
              borderRadius: 16,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: demoMode ? C.amber : C.textSub,
                boxShadow: demoMode ? `0 0 6px ${C.amber}` : "none",
              }}
            />
            {demoMode ? "Demo Mode: ON" : "Demo Mode: OFF"}
          </button>
        </div>
        {pageMap[page]}
      </main>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role || "user";
        // eslint-disable-next-line
        setUserRole(role);
        localStorage.setItem("userRole", role);
      } catch (e) { // eslint-disable-line no-unused-vars
        // eslint-disable-next-line
        setUserRole("user");
        localStorage.setItem("userRole", "user");
      }
    } else {
      // eslint-disable-next-line
      setUserRole("");
      localStorage.removeItem("userRole");
    }
  }, [token]);

  const createApiFetch = (authToken) => {
    return async (url, options = {}) => {
      const hdrs = { ...(options.headers || {}) };
      if (authToken) {
        hdrs["Authorization"] = `Bearer ${authToken}`;
      }
      return fetch(url, { ...options, headers: hdrs });
    };
  };

  const apiFetch = createApiFetch(token);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          token ?
            <DashboardLayout token={token} setToken={setToken} userRole={userRole} apiFetch={apiFetch} /> :
            <Landing setToken={setToken} setUserRole={setUserRole} />
        } />
        <Route
          path="/admin"
          element={
            token && userRole === "admin" ?
              <Admin token={token} apiFetch={apiFetch} /> :
              <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
