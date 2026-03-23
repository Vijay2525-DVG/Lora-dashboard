const mysql = require("mysql2/promise");
const bcrypt = require('bcryptjs');

async function setupTestuser() {
  const db = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "VIJAYrh@123",
    database: "lora_monitoring"
  });

  try {
    // Ensure role column
    try {
      await db.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'");
    } catch (e) {}

    // Delete existing testuser
    await db.query("DELETE FROM users WHERE username = 'testuser'");
    console.log("Deleted existing testuser");

    // Create with password "password"
    const hash = bcrypt.hashSync('password', 10);
    await db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", ['testuser', hash]);
    console.log("✓ Created testuser with password 'password', role: admin");

    const [users] = await db.query("SELECT username, role FROM users WHERE username = 'testuser'");
    console.log("Status:", users[0]);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await db.end();
  }
}

setupTestuser();

