
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import StatCard from "./components/statcard";
import SensorChart from "./components/sensorchart";
import MultiDeviceChart from "./components/MultiDeviceChart";
import DataTable from "./components/datatable";
import GPSMap from "./components/gpsmap";
import DeviceDetail from "./components/DeviceDetail";
import AlertPanel from "./components/AlertPanel";
import AdminPanel from "./components/AdminPanel";
import Admin from "./pages/Admin";
import Reports from "./components/Reports";

function Dashboard() {
  const navigate = useNavigate();
  // --- authentication state ---
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [usernameDisplay, setUsernameDisplay] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState(null);

  const [backendOnline, setBackendOnline] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [allDeviceData, setAllDeviceData] = useState({});
  const [deviceHistory, setDeviceHistory] = useState({});
  const [demoMode, setDemoMode] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [viewMode, setViewMode] = useState("single");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [viewingDeviceDetail, setViewingDeviceDetail] = useState(false);
  const [addPickMode, setAddPickMode] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [newDeviceData, setNewDeviceData] = useState({ name: "", latitude: "", longitude: "", location_name: "" });
  const [addingDevice, setAddingDevice] = useState(false);
const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [alertLoading, setAlertLoading] = useState(true);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [showPassword, setShowPassword] = useState(false);
  const [alertSettings, setAlertSettings] = useState({});
  const [showReports, setShowReports] = useState(false);

  /* decode token to show username and role */
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsernameDisplay(payload.username || "");
        const role = payload.role || "user";
        setUserRole(role);
        localStorage.setItem("userRole", role);
      } catch (e) {
        setUsernameDisplay("");
        setUserRole("user");
        localStorage.setItem("userRole", "user");
      }
    } else {
      setUsernameDisplay("");
      setUserRole("");
      localStorage.removeItem("userRole");
    }
  }, [token]);

  /* helper that always attaches authorization header */
  const apiFetch = async (url, options = {}) => {
    const hdrs = { ...(options.headers || {}) };
    if (token) {
      hdrs["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { ...options, headers: hdrs });
    if ((resp.status === 401 || resp.status === 403) && token) {
      // token is invalid or expired, drop it and force re-login
      setToken("");
      localStorage.removeItem("token");
    }
    return resp;
  };

  /* Backend health check */
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("http://localhost:5000/health");
        setBackendOnline(r.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    // Check less frequently since data doesn't change quickly (every 30 seconds)
    const timeout = setTimeout(() => setLoading(false), 5000);
    const i = setInterval(check, 30000);
    return () => {
      clearInterval(i);
      clearTimeout(timeout);
    };
  }, []);

  /* Load devices */
  useEffect(() => {
    if (!backendOnline || !token) return;

    // Reset all device data when user changes
    setAllDeviceData({});
    setDeviceHistory({});
    setSelectedDeviceId("");
    
    setLoading(true);
    apiFetch("http://localhost:5000/api/devices")
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch devices");
        return r.json();
      })
      .then(d => {
        console.log("Devices loaded:", d);
        setDevices(d);
        if (!selectedDeviceId && d.length > 0) {
          setSelectedDeviceId(d[0].id);
        }
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load devices:", err);
        setLoading(false);
        setError("Could not connect to backend. Make sure the server is running.");
      });
  }, [backendOnline, token]);

  /* Fetch alert settings for all devices */
  useEffect(() => {
    if (!backendOnline || !token || devices.length === 0) return;
    
    const fetchAlertSettings = async () => {
      try {
        const response = await apiFetch("http://localhost:5000/api/alerts");
        if (response.ok) {
          const data = await response.json();
          const settingsMap = {};
          data.forEach(s => { settingsMap[s.device_id] = s; });
          setAlertSettings(settingsMap);
        }
      } catch (error) {
        console.error("Error fetching alert settings:", error);
      }
    };
    
    fetchAlertSettings();
  }, [backendOnline, token, devices.length]);

  /* Fetch active alerts count */
  useEffect(() => {
    if (!backendOnline || !token) return;

    const fetchAlertCount = async () => {
      try {
        const response = await apiFetch("http://localhost:5000/api/alerts/active");
        if (response.ok) {
          const data = await response.json();
          setAlertCount(data.length);
        }
      } catch (error) {
        console.error("Error fetching alert count:", error);
      } finally {
        setAlertLoading(false);
      }
    };

    fetchAlertCount();
    const alertInterval = setInterval(fetchAlertCount, 30000); // Update every 30 seconds
    
    return () => clearInterval(alertInterval);
  }, [backendOnline, token]);

  /* Fetch ALL device data continuously */
  useEffect(() => {
    if (!backendOnline || demoMode || devices.length === 0 || !token) return;

    const intervalRef = { current: null };
    
    const fetchAllDeviceData = async () => {
      try {
        const r = await apiFetch("http://localhost:5000/api/all-devices-data");
        const data = await r.json();
        console.log("All device data fetched:", data);
        
        setAllDeviceData(data);
        
        Object.values(data).forEach(deviceData => {
          if (deviceData.status === 'online' && deviceData.soil !== undefined) {
            setDeviceHistory(prev => {
              const deviceHist = prev[deviceData.id] || [];
              const newEntry = {
                ...deviceData,
                time: new Date().toLocaleTimeString(),
                created_at: deviceData.last_update || new Date()
              };
              return {
                ...prev,
                [deviceData.id]: [newEntry, ...deviceHist.slice(0, 49)]
              };
            });
          }
        });
      } catch (err) {
        console.error("Failed to fetch all device data:", err);
        
        const deviceDataMap = {};
        const promises = devices.map(async (device) => {
          try {
            const r = await apiFetch(`http://localhost:5000/api/data/${device.id}`);
            const json = await r.json();
            return { deviceId: device.id, data: json, device };
          } catch (e) {
            return { deviceId: device.id, data: { offline: true }, device };
          }
        });
        
        const results = await Promise.all(promises);
        results.forEach(({ deviceId, data, device }) => {
          if (!data.offline) {
            const entry = {
              ...data,
              time: new Date().toLocaleTimeString(),
              deviceName: device.name || deviceId
            };
            deviceDataMap[deviceId] = entry;
            
            setDeviceHistory(prev => {
              const deviceHist = prev[deviceId] || [];
              return {
                ...prev,
                [deviceId]: [{ ...entry, created_at: new Date() }, ...deviceHist.slice(0, 49)]
              };
            });
          }
        });
        setAllDeviceData(prev => ({ ...prev, ...deviceDataMap }));
      }
    };

    fetchAllDeviceData();
    intervalRef.current = setInterval(fetchAllDeviceData, 300000); // 5 minutes
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [backendOnline, demoMode, devices.length]);

  /* Demo Mode - Generate random data */
  useEffect(() => {
    if (!demoMode || devices.length === 0) return;

    const intervalRef = { current: null };
    
    const generateDemoData = () => {
      const baseConfigs = {
        "device_1": { soil: 1800, temp: 28, hum: 60, rssi: -85 },
        "device_2": { soil: 2200, temp: 32, hum: 45, rssi: -92 },
        "device_3": { soil: 1500, temp: 25, hum: 70, rssi: -78 },
      };

      const newData = {};
      
      devices.forEach((device, idx) => {
        const base = baseConfigs[device.id] || { 
          soil: 1500 + idx * 300, 
          temp: 25 + idx * 3, 
          hum: 50 + idx * 10, 
          rssi: -80 - idx * 5 
        };
        
        const newEntry = {
          soil: base.soil + Math.floor(Math.random() * 500) - 250,
          temperature: base.temp + Math.floor(Math.random() * 6) - 3,
          humidity: Math.max(0, Math.min(100, base.hum + Math.floor(Math.random() * 20) - 10)),
          rssi: base.rssi + Math.floor(Math.random() * 10) - 5,
          time: new Date().toLocaleTimeString(),
          deviceName: device.name || device.id,
          status: 'online'
        };
        
        newData[device.id] = newEntry;
        
        setDeviceHistory(prev => {
          const deviceHist = prev[device.id] || [];
          return {
            ...prev,
            [device.id]: [{ ...newEntry, created_at: new Date() }, ...deviceHist.slice(0, 49)]
          };
        });
      });

      setAllDeviceData(newData);
    };

generateDemoData();
    intervalRef.current = setInterval(generateDemoData, 10000); // Update every 10 seconds to reduce flickering
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [demoMode, devices.length]);

  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    console.log("Dropdown changed to:", newDeviceId);
    setSelectedDeviceId(newDeviceId);
  };

  const handleDeviceClick = (deviceId) => {
    console.log("Device clicked from GPS map:", deviceId);
    setSelectedDeviceId(deviceId);
  };

  const handleAddDevice = async () => {
    setAddingDevice(true);
    try {
      // Use user-provided name or generate a default
      const deviceName = newDeviceData.name || `Device_${Date.now()}`;
      const response = await apiFetch("http://localhost:5000/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deviceName,
          latitude: newDeviceData.latitude ? parseFloat(newDeviceData.latitude) : null,
          longitude: newDeviceData.longitude ? parseFloat(newDeviceData.longitude) : null,
          location_name: newDeviceData.location_name || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Device added:", result);
        
        const devicesResponse = await apiFetch("http://localhost:5000/api/devices");
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
        
        setSelectedDeviceId(result.id);
        
        // Refresh the map to show the new device's GPS location
        setMapRefreshKey(prev => prev + 1);
        
        setShowAddDeviceModal(false);
        setNewDeviceData({ name: "", latitude: "", longitude: "", location_name: "" });
        setAddPickMode(false);
      }
    } catch (error) {
      console.error("Error adding device:", error);
    }
    setAddingDevice(false);
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    // Confirm before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete "${deviceName || deviceId}"? This will also delete all sensor data for this device.`);
    if (!confirmDelete) return;
    
    console.log("Deleting device:", deviceId);
    
    try {
      const response = await apiFetch(`http://localhost:5000/api/devices/${deviceId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        console.log("Device deleted:", deviceId);
        
        // Refresh devices list
        const devicesResponse = await apiFetch("http://localhost:5000/api/devices");
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
        
        // If the deleted device was selected, select another one
        if (selectedDeviceId === deviceId) {
          setSelectedDeviceId(devicesData.length > 0 ? devicesData[0].id : "");
        }
        
        // Refresh the map
        setMapRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert("Failed to delete device: " + (error.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      alert("Error deleting device. Make sure you are the owner of this device.");
    }
  };

  const getCardInfo = (title) => {
    const info = {
      "Soil": {
        description: "Soil moisture sensor reading (ADC value)",
        range: "0-4095 (12-bit ADC)",
        tips: "Lower values indicate wetter soil, higher values mean drier soil"
      },
      "Temp": {
        description: "Temperature reading from DHT sensor",
        range: "-40°C to 80°C",
        tips: "Optimal growth temperature for most plants: 18-24°C"
      },
      "Humidity": {
        description: "Relative humidity percentage",
        range: "0-100%",
        tips: "Optimal humidity for plants: 40-60%"
      },
      "RSSI": {
        description: "Received Signal Strength Indicator",
        range: "-30 to -120 dBm",
        tips: "Higher (closer to 0) is better. -50 dBm is excellent signal"
      }
    };
    return info[title] || {};
  };

  const currentData = allDeviceData[selectedDeviceId] || null;
  const history = deviceHistory[selectedDeviceId] || [];
  const [fullHistory, setFullHistory] = useState([]);
  const [timeRange, setTimeRange] = useState('24h'); // Default to 24 hours

  useEffect(() => {
    if (!selectedDeviceId) return;
    apiFetch(`http://localhost:5000/api/history/${selectedDeviceId}?range=${timeRange}`)
      .then(r => r.json())
      .then(data => {
        // the server returns oldest first
        setFullHistory(data || []);
      })
      .catch(err => console.error('Failed to load full history', err));
  }, [selectedDeviceId, timeRange]);
  const onlineDevices = Object.values(allDeviceData).filter(d => d.status === 'online').length;

  // if user not logged in show landing page with auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  if (!token) {
    return (
      <div className="landing-page">
        {/* Header */}
        <header className="landing-header">
          <div className="landing-logo">
            <span className="logo-icon">📡</span>
            <span className="logo-text">LoRa Soil Monitor</span>
          </div>
          <nav className="landing-nav">
            <a href="#home" className="nav-link">Home</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>
          <div className="landing-auth-buttons">
            <button className="btn-login" onClick={() => { setAuthMode("login"); setShowAuthModal(true); setAuthError(null); }}>
              Login
            </button>
            <button className="btn-signup" onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }}>
              Sign Up
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section id="home" className="landing-hero">
          <div className="hero-bg-pattern"></div>
          <div className="hero-content-landing">
            <h1>Smart Agriculture Through<br /><span className="gradient-text">IoT Innovation</span></h1>
            <p className="hero-subtitle">Monitor your soil conditions in real-time with LoRa technology. Make data-driven decisions for healthier crops and higher yields.</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }}>
                Get Started Free <span>→</span>
              </button>
              <button className="btn-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </button>
            </div>
            <div className="hero-stats-landing">
              <div className="stat-item">
                <span className="stat-value">500+</span>
                <span className="stat-label">Active Sensors</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">24/7</span>
                <span className="stat-label">Monitoring</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-header">
            <h2>Powerful Features</h2>
            <p>Everything you need to monitor and manage your agricultural sensors</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-large">🌱</div>
              <h3>Soil Monitoring</h3>
              <p>Track soil moisture, temperature, and humidity in real-time. Get accurate readings from multiple sensors across your fields.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📊</div>
              <h3>Data Visualization</h3>
              <p>Beautiful interactive charts and graphs. View historical data, analyze trends, and export reports for better decision making.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🔔</div>
              <h3>Smart Alerts</h3>
              <p>Configure custom thresholds and receive instant notifications via the dashboard when conditions need attention.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🗺️</div>
              <h3>GPS Tracking</h3>
              <p>Visualize all your devices on an interactive map. Know the exact location of every sensor in your network.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📡</div>
              <h3>LoRa Technology</h3>
              <p>Long-range wireless communication with low power consumption. Connect sensors kilometers away from the gateway.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🔒</div>
              <h3>Secure Access</h3>
              <p>Role-based access control ensures data security. Manage team members with admin and user permissions.</p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="how-it-works-section">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Get started in three simple steps</p>
          </div>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Create Account</h3>
              <p>Sign up for free and create your dashboard</p>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Add Devices</h3>
              <p>Register your LoRa sensors to your account</p>
            </div>
            <div className="step-connector"></div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Start Monitoring</h3>
              <p>View real-time data and configure alerts</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Transform Your Agriculture?</h2>
            <p>Join thousands of farmers already using IoT to improve their yield</p>
            <button className="btn-primary btn-large" onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }}>
              Start Free Today <span>→</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="landing-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="landing-logo">
                <span className="logo-icon">📡</span>
                <span className="logo-text">LoRa Soil Monitor</span>
              </div>
              <p>Real-time IoT sensor monitoring for smart agriculture</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#">Pricing</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
                <a href="#">Careers</a>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="#">Documentation</a>
                <a href="#">API</a>
                <a href="#">Status</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 LoRa Soil Monitor. All rights reserved.</p>
          </div>
        </footer>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
              <div className="auth-modal-header">
                <h2>{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
                <p>{authMode === "login" ? "Sign in to your dashboard" : "Start your free account"}</p>
              </div>
              
              <div className="auth-modal-tabs">
                <button 
                  className={`auth-modal-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => { setAuthMode("login"); setAuthError(null); }}
                >
                  Login
                </button>
                <button 
                  className={`auth-modal-tab ${authMode === "register" ? "active" : ""}`}
                  onClick={() => { setAuthMode("register"); setAuthError(null); }}
                >
                  Sign Up
                </button>
              </div>
              
              <form 
                className="auth-modal-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  const url = authMode === "login" ? "/api/login" : "/api/register";
                  try {
                    const r = await fetch("http://localhost:5000" + url, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        username: authUser,
                        password: authPass,
                      }),
                    });
                    const data = await r.json();
                    if (!r.ok) {
                      throw new Error(data.error || "Authentication failed");
                    }
                    if (authMode === "login") {
                      setToken(data.token);
                      localStorage.setItem("token", data.token);
                      setShowAuthModal(false);
                    } else {
                      setAuthMode("login");
                      setAuthError("Registration successful! Please sign in.");
                    }
                  } catch (err) {
                    console.error("Auth error", err);
                    setAuthError(err.message);
                  }
                }}
              >
                <div className="form-group-modal">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={authUser}
                    onChange={(e) => setAuthUser(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-modal">
                  <label>Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {authError && <div className="auth-error-modal">{authError}</div>}
                <button type="submit" className="auth-modal-submit">
                  {authMode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <h2>Loading Dashboard...</h2>
          <p>Connecting to backend on http://localhost:5000</p>
          <p style={{marginTop: "20px", fontSize: "12px", color: "#94a3b8"}}>Backend Online: {backendOnline ? "Yes" : "No"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <div className="error-steps">
            <p><strong>To fix this:</strong></p>
            <ol>
              <li>Make sure MySQL is running</li>
              <li>Start the backend: <code>cd backend && npm start</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button className="demo-btn" onClick={() => { setError(null); setDemoMode(true); }}>
            Try Demo Mode Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {viewingDeviceDetail && selectedDeviceId && (
        <DeviceDetail
          device={devices.find(d => d.id === selectedDeviceId) || {}}
          data={allDeviceData[selectedDeviceId]}
          history={deviceHistory[selectedDeviceId] || []}
          fullHistory={fullHistory}
          onBack={() => setViewingDeviceDetail(false)}
        />
      )}

      {!viewingDeviceDetail && (
        <>
      <header className="dashboard-header">
<div className="dashboard-brand">
          <span className="brand-icon">📡</span>
          <div className="brand-text">
            <h1>LoRa Monitor</h1>
            <span className="brand-tagline">Smart Agriculture</span>
          </div>
        </div>
        
        <div className="dashboard-nav">
{/* Demo Mode Button - Always visible in header */}
          <button 
            className={`demo-btn ${demoMode ? 'active' : ''}`}
            onClick={() => setDemoMode(!demoMode)}
            style={{ marginRight: '10px' }}
          >
            {demoMode ? 'Demo: ON' : 'Demo Mode'}
          </button>
          
          <button 
            className="add-device-btn" 
            onClick={() => setShowAddDeviceModal(true)}
            style={{ marginRight: '10px' }}
          >
            + Add Device
          </button>
          
          <div className="view-toggle" style={{ marginRight: '10px' }}>
            <button 
              className={`view-toggle-btn ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
            >
              Single
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All Devices
            </button>
          </div>
          
          <select value={selectedDeviceId} onChange={handleDeviceChange} className="device-dropdown">
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.name || d.id}
              </option>
            ))}
          </select>
          
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="time-dropdown">
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {userRole === "admin" && (
            <a href="/admin" className="nav-btn" style={{ marginLeft: '10px' }}>
              Admin
            </a>
          )}
          
<button className="nav-btn" onClick={() => setShowAlertPanel(true)} style={{ marginLeft: '10px' }}>
            Alerts {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
          </button>
          
          <button className="nav-btn" onClick={() => setShowReports(true)} style={{ marginLeft: '10px' }}>
            📊 Reports
          </button>
          
          <button className="nav-btn logout-btn" onClick={() => {
            setToken("");
            localStorage.removeItem("token");
            setDevices([]);
          }}>
            Logout
          </button>
          
          <span className={`status-dot ${backendOnline ? "online" : "offline"}`} title={backendOnline ? "Connected" : "Disconnected"}></span>
        </div>
      </header>

      {showMap && (
        <GPSMap
          devices={devices}
          onDeviceClick={handleDeviceClick}
          selectedDevice={selectedDeviceId}
          addPickMode={addPickMode}
          refreshKey={mapRefreshKey}
          onNewLocationPick={(lat, lng) => {
            setNewDeviceData(prev => ({
              ...prev,
              latitude: lat.toString(),
              longitude: lng.toString()
            }));
            setAddPickMode(false);
          }}
          onDeviceNameClick={(deviceId) => {
            setSelectedDeviceId(deviceId);
            setViewingDeviceDetail(true);
          }}
          onDeleteDevice={handleDeleteDevice}
        />
      )}

      <div className="dashboard-content">
        {viewMode === 'all' ? (
          <div className="all-devices-view">
<MultiDeviceChart devices={devices} allDeviceData={allDeviceData} deviceHistory={deviceHistory} alertSettings={alertSettings} />
          </div>
        ) : (
        <>
{/* Stats Cards - Soil, Temperature, Humidity, RSSI */}
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-icon">Soil</span>
            <div className="stat-info">
              <span className="stat-value">{currentData?.soil || "--"}</span>
              <span className="stat-label">Moisture</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">Temp</span>
            <div className="stat-info">
              <span className="stat-value">{currentData?.temperature ? `${currentData.temperature}°C` : "--"}</span>
              <span className="stat-label">Temperature</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">Hum</span>
            <div className="stat-info">
              <span className="stat-value">{currentData?.humidity ? `${currentData.humidity}%` : "--"}</span>
              <span className="stat-label">Humidity</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">RSSI</span>
            <div className="stat-info">
              <span className="stat-value">{currentData?.rssi || "--"}</span>
              <span className="stat-label">Signal</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <SensorChart title="Soil Moisture" data={history} dataKey="soil" color="#22c55e" unit="ADC" />
          <SensorChart title="Temperature" data={history} dataKey="temperature" color="#f97316" unit="°C" />
          <SensorChart title="Humidity" data={history} dataKey="humidity" color="#38bdf8" unit="%" />
        </div>
        </>
        )}

        <div className="data-section">
          <h3 className="section-title">Recent Readings</h3>
          <DataTable data={fullHistory.length > 0 ? fullHistory : history} showFull={false} />
        </div>
      </div>

{/* Alert Panel Modal */}
      {showAlertPanel && (
        <div className="modal-overlay" onClick={() => setShowAlertPanel(false)}>
          <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
            <AlertPanel 
              devices={devices} 
              onClose={() => setShowAlertPanel(false)} 
            />
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div className="modal-overlay" onClick={() => setShowReports(false)}>
          <div className="reports-modal-content" onClick={(e) => e.stopPropagation()}>
            <Reports 
              token={token} 
              onBack={() => setShowReports(false)} 
            />
          </div>
        </div>
      )}
      
      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="modal-overlay" onClick={() => { setShowAddDeviceModal(false); setAddPickMode(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={() => { setShowAddDeviceModal(false); setAddPickMode(false); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Device Name *</label>
                <input type="text" placeholder="e.g., Sensor 1" value={newDeviceData.name}
                  onChange={(e) => setNewDeviceData({...newDeviceData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" placeholder="e.g., Greenhouse" value={newDeviceData.location_name}
                  onChange={(e) => setNewDeviceData({...newDeviceData, location_name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="any" placeholder="13.0823" value={newDeviceData.latitude}
                    onChange={(e) => setNewDeviceData({...newDeviceData, latitude: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="any" placeholder="80.2707" value={newDeviceData.longitude}
                    onChange={(e) => setNewDeviceData({...newDeviceData, longitude: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddDeviceModal(false)}>Cancel</button>
              <button className="btn-add" onClick={handleAddDevice} disabled={addingDevice}>
                {addingDevice ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// App component with routing
export default function App() {
  const token = localStorage.getItem("token") || "";
  const userRole = localStorage.getItem("userRole") || "";
  
  // Helper function to create apiFetch with token
  const createApiFetch = (authToken) => {
    return async (url, options = {}) => {
      const hdrs = { ...(options.headers || {}) };
      if (authToken) {
        hdrs["Authorization"] = `Bearer ${authToken}`;
      }
      const resp = await fetch(url, { ...options, headers: hdrs });
      return resp;
    };
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route 
          path="/admin" 
          element={
            token && userRole === "admin" ? 
              <Admin token={token} apiFetch={createApiFetch(token)} /> : 
              <Navigate to="/" />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

