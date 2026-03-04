import { db } from './backend/db.js';
(async() => {
  const [rows] = await db.query('SELECT id,user_id,latitude,longitude,location_name FROM devices');
  console.table(rows);
  process.exit();
})();
