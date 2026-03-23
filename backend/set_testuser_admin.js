const { db } = require('./db.js');

async function setTestuserAdmin() {
  try {
    await db.promise().query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin') DEFAULT 'user'");
  } catch (e) {
    // Ignore if already exists
  }
  
  const [existing] = await db.promise().query("SELECT id FROM users WHERE username = 'testuser'");
  if (existing.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin', 10);
    await db.promise().query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", ['testuser', hash]);
    console.log("✓ Created testuser (password: admin)");
  } else {
    await db.promise().query("UPDATE users SET role = 'admin' WHERE username = 'testuser'");
    console.log("✓ Set testuser role to admin");
  }

  const [users] = await db.promise().query("SELECT username, role FROM users WHERE username = 'testuser'");
  console.log('Status:', users[0]);
  console.log("Done!");
}

setTestuserAdmin().catch(console.error);

