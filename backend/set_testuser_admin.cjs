const mysql = require("mysql2/promise");

async function setTestuserAdmin() {
  const db = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "VIJAYrh@123",
    database: "lora_monitoring"
  });

  try {
    // Add role if not exists
    try {
      await db.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'");
    } catch (e) {
      // Ignore if exists
    }
    
    // Check if testuser exists
    const [existing] = await db.query("SELECT id FROM users WHERE username = 'testuser'");
    if (existing.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin', 10);
      await db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", ['testuser', hash]);
      console.log("✓ Created testuser (password: admin, role: admin)");
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE username = 'testuser'");
      console.log("✓ Set testuser role to admin");
    }

    // Verify
    const [users] = await db.query("SELECT username, role FROM users WHERE username = 'testuser'");
    console.log('Status:', users[0] || "No testuser");
    console.log("\\n✅ testuser is now ADMIN!");
    console.log("Password: admin");
    console.log("Start server: cd backend && node server.js");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await db.end();
  }
}

setTestuserAdmin();

