import React, { useState } from 'react';
import { C, Icon } from '../App';

const Btn = ({ label, onClick, color = C.green, outline, icon, disabled, type = "button", style = {} }) => (
    <button type={type} onClick={onClick} disabled={disabled}
        style={{
            background: outline ? "transparent" : color + "22",
            color: disabled ? C.textSub : color,
            border: `1.5px solid ${disabled ? C.textSub : color}`,
            borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            letterSpacing: 0.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .15s", opacity: disabled ? 0.5 : 1,
            ...style
        }}>
        {icon && <Icon name={icon} size={16} color={disabled ? C.textSub : color} />}
        {label}
    </button>
);

export default function Landing({ setToken, setUserRole }) {
    const [authMode, setAuthMode] = useState("login");
    const [authUser, setAuthUser] = useState("");
    const [authPass, setAuthPass] = useState("");
    const [authError, setAuthError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    return (
        <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflowX: "hidden" }}>

            {/* Header */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: `1px solid ${C.cardBorder}`, background: C.surface + "cc", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: C.green + "22", border: `1.5px solid ${C.green}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="leaf" size={20} color={C.green} />
                    </div>
                    <div>
                        <div style={{ color: C.green, fontWeight: 800, fontSize: 18, letterSpacing: 0.5, fontFamily: "'Georgia', serif" }}>Krishi Setu</div>
                        <div style={{ color: C.textSub, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Smart Agri IoT</div>
                    </div>
                </div>

                <nav style={{ gap: 24, display: "none" /* hide on very small screens could be done here */ }}>
                    {["Features", "How It Works", "About"].map(item => (
                        <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} style={{ color: C.textMuted, textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = C.green} onMouseLeave={e => e.target.style.color = C.textMuted}>{item}</a>
                    ))}
                </nav>

                <div style={{ display: "flex", gap: 12 }}>
                    <Btn label="Login" outline color={C.green} onClick={() => { setAuthMode("login"); setShowAuthModal(true); setAuthError(null); }} />
                    <Btn label="Sign Up" color={C.green} onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }} />
                </div>
            </header>

            {/* Hero Section */}
            <section style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "100px 20px", position: "relative" }}>
                {/* Abstract Background Elements */}
                <div style={{ position: "absolute", top: "20%", left: "10%", width: 300, height: 300, background: C.green, filter: "blur(150px)", opacity: 0.1, borderRadius: "50%", zIndex: 0 }} />
                <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 250, height: 250, background: C.amber, filter: "blur(150px)", opacity: 0.05, borderRadius: "50%", zIndex: 0 }} />

                <div style={{ zIndex: 1, maxWidth: 800 }}>
                    <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", fontFamily: "'Georgia', serif" }}>
                        Smart Agriculture Through <br />
                        <span style={{ color: C.green }}>IoT Innovation</span>
                    </h1>
                    <p style={{ fontSize: 18, color: C.textMuted, lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 600 }}>
                        Monitor your soil conditions in real-time with LoRa technology. Make data-driven decisions for healthier crops and higher yields.
                    </p>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                        <Btn label="Get Started Free ➔" color={C.green} style={{ padding: "14px 28px", fontSize: 15 }} onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }} />
                        <Btn label="Learn More" outline color={C.textMuted} style={{ padding: "14px 28px", fontSize: 15 }} onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 60, flexWrap: "wrap", padding: "20px", background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: C.green, fontSize: 32, fontWeight: 800, fontFamily: "monospace" }}>500+</span>
                            <span style={{ color: C.textSub, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Active Sensors</span>
                        </div>
                        <div style={{ width: 1, background: C.cardBorder }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: C.blue, fontSize: 32, fontWeight: 800, fontFamily: "monospace" }}>99.9%</span>
                            <span style={{ color: C.textSub, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Uptime</span>
                        </div>
                        <div style={{ width: 1, background: C.cardBorder }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: C.amber, fontSize: 32, fontWeight: 800, fontFamily: "monospace" }}>24/7</span>
                            <span style={{ color: C.textSub, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Monitoring</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={{ padding: "80px 40px", background: C.surface, borderTop: `1px solid ${C.cardBorder}` }}>
                <div style={{ textAlign: "center", marginBottom: 60 }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px", fontFamily: "'Georgia', serif" }}>Powerful Features</h2>
                    <p style={{ color: C.textMuted, fontSize: 16 }}>Everything you need to monitor and manage your agricultural sensors</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
                    {[
                        { icon: "moisture", title: "Soil Monitoring", desc: "Track soil moisture, temperature, and humidity in real-time. Get accurate readings from multiple sensors.", color: C.green },
                        { icon: "analytics", title: "Data Visualization", desc: "Beautiful interactive charts and graphs. View historical data, analyze trends, and export reports.", color: C.blue },
                        { icon: "alerts", title: "Smart Alerts", desc: "Configure custom thresholds and receive instant notifications via the dashboard when conditions need attention.", color: C.red },
                        { icon: "map", title: "GPS Tracking", desc: "Visualize all your devices on an interactive map. Know the exact location of every sensor in your network.", color: C.amber },
                        { icon: "sensors", title: "LoRa Technology", desc: "Long-range wireless communication with low power consumption. Connect sensors kilometers away.", color: "#a78bfa" },
                        { icon: "settings", title: "Secure Access", desc: "Role-based access control ensures data security. Manage team members with admin and user permissions.", color: C.textMuted }
                    ].map((f, i) => (
                        <div key={i} style={{ background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "30px", display: "flex", flexDirection: "column", gap: 16, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: f.color + "11", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon name={f.icon} size={24} color={f.color} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{f.title}</h3>
                            <p style={{ margin: 0, color: C.textSub, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: "100px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at center, ${C.green}1A 0%, transparent 70%)` }} />
                <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 16px", fontFamily: "'Georgia', serif" }}>Ready to Transform Your Agriculture?</h2>
                    <p style={{ color: C.textMuted, fontSize: 16, marginBottom: 32 }}>Join thousands of farmers already using IoT to improve their yield</p>
                    <Btn label="Start Free Today ➔" color={C.green} style={{ padding: "16px 32px", fontSize: 16 }} onClick={() => { setAuthMode("register"); setShowAuthModal(true); setAuthError(null); }} />
                </div>
            </section>

            {/* Auth Modal */}
            {showAuthModal && (
                <div style={{ position: "fixed", inset: 0, background: "#000000bb", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowAuthModal(false)}>

                    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", position: "relative", boxShadow: `0 24px 48px rgba(0,0,0,0.5)` }} onClick={(e) => e.stopPropagation()}>
                        {/* Top accent line */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.green}, ${C.blue})` }} />

                        <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }} onClick={() => setShowAuthModal(false)}>
                            <Icon name="close" size={20} color={C.textMuted} />
                        </button>

                        <div style={{ padding: "40px 32px 32px" }}>
                            <div style={{ textAlign: "center", marginBottom: 32 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 14, background: C.green + "22", border: `1.5px solid ${C.green}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                    <Icon name="leaf" size={24} color={C.green} />
                                </div>
                                <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", fontFamily: "'Georgia', serif" }}>
                                    {authMode === "login" ? "Welcome Back" : "Create Account"}
                                </h2>
                                <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
                                    {authMode === "login" ? "Sign in to your IoT dashboard" : "Start monitoring your sensors today"}
                                </p>
                            </div>

                            <div style={{ display: "flex", background: C.surface, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${C.cardBorder}` }}>
                                <button
                                    style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s", background: authMode === "login" ? C.card : "transparent", color: authMode === "login" ? C.green : C.textMuted, boxShadow: authMode === "login" ? `0 2px 8px rgba(0,0,0,0.2)` : "none" }}
                                    onClick={() => { setAuthMode("login"); setAuthError(null); }}
                                >
                                    Login
                                </button>
                                <button
                                    style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s", background: authMode === "register" ? C.card : "transparent", color: authMode === "register" ? C.green : C.textMuted, boxShadow: authMode === "register" ? `0 2px 8px rgba(0,0,0,0.2)` : "none" }}
                                    onClick={() => { setAuthMode("register"); setAuthError(null); }}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
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
                                        if (data.role) {
                                            setUserRole(data.role);
                                        }
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
                            }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    <div>
                                        <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Username</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your username"
                                            value={authUser}
                                            onChange={(e) => setAuthUser(e.target.value)}
                                            required
                                            style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "12px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border 0.2s" }}
                                            onFocus={e => e.target.style.border = `1px solid ${C.green}`}
                                            onBlur={e => e.target.style.border = `1px solid ${C.cardBorder}`}
                                        />
                                    </div>
                                    <div style={{ position: "relative" }}>
                                        <label style={{ display: "block", color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Password</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={authPass}
                                            onChange={(e) => setAuthPass(e.target.value)}
                                            required
                                            style={{ width: "100%", background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "12px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", paddingRight: 40, transition: "border 0.2s" }}
                                            onFocus={e => e.target.style.border = `1px solid ${C.green}`}
                                            onBlur={e => e.target.style.border = `1px solid ${C.cardBorder}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0 }}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                {authError && (
                                    <div style={{ padding: "12px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: 8, color: C.red, fontSize: 13, marginTop: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
                                        <Icon name="alerts" size={16} color={C.red} />
                                        <span style={{ flex: 1 }}>{authError}</span>
                                    </div>
                                )}

                                <Btn
                                    label={authMode === "login" ? "Sign In to Dashboard" : "Create Account"}
                                    color={C.green}
                                    type="submit"
                                    style={{ width: "100%", marginTop: 24, padding: "14px", fontSize: 15 }}
                                />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
