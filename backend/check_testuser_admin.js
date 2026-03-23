import { db } from './db.js';

async function checkTestuser() {
  try {
    // Make testuser admin
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'");
    
    const [existing] = await db.query("SELECT id FROM users WHERE username = 'testuser'");
    if (existing.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = bcrypt.hashSync('admin', 10);
      await db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", ['testuser', hash]);
      console.log("✓ Created testuser (password: admin, role: admin)");
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE username = 'testuser'");
      console.log("✓ Updated testuser role to admin");
    }

    // Verify
    const [users] = await db.query("SELECT username, role FROM users WHERE username = 'testuser'");
    console.log("Current status:", users[0] || "No testuser");
    
    console.log("\\n✅ testuser is now ADMIN!");
    console.log("Login: POST /api/login {username: 'testuser', password: 'admin'}");
    console.log("Run: node server.js");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkTestuser();

