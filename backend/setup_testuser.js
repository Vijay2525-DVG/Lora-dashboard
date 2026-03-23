import { db } from './db.js';
import bcrypt from 'bcryptjs';

async function setupTestuser() {
  try {
    // Role column
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'");

    // testuser as admin
    const [existing] = await db.query("SELECT id FROM users WHERE username = 'testuser'");
    if (existing.length === 0) {
      const hash = bcrypt.hashSync('admin', 10);
      await db.query("INSERT INTO users (username, password_hash, role) VALUES ('testuser', ?, 'admin')", [hash]);
      console.log("✓ Created testuser (password: admin)");
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE username = 'testuser'");
      console.log("✓ Set testuser as admin");
    }

    const [user] = await db.query("SELECT username, role FROM users WHERE username = 'testuser'");
    console.log('Status:', user[0]);

    console.log("✅ Ready! Login: testuser / admin");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

setupTestuser();

