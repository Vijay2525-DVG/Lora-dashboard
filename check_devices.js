import { db } from './backend/db.js';
(async() => {
  const [rows] = await db.query('SELECT id,user_id,name FROM devices');
  console.log(rows);
  process.exit();
})();
