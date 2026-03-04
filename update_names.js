import { db } from './backend/db.js';
(async () => {
  try {
    const [res] = await db.query("UPDATE devices SET name = location_name WHERE name LIKE 'Device %' AND location_name IS NOT NULL");
    console.log('Updated rows:', res.affectedRows);
    const [rows] = await db.query('SELECT id, user_id, name, location_name FROM devices ORDER BY id');
    console.table(rows);
  } catch (err) {
    console.error('Error updating names:', err);
  } finally {
    process.exit();
  }
})();
