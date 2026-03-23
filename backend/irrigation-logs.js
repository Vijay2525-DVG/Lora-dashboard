// Simple endpoint wrapper for irrigation logs (admin use)
import express from 'express';
import { db } from './db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { limit = 50, device_id } = req.query;
  try {
    const query = `
      SELECT il.*, d.name as device_name, l.name as land_name 
      FROM irrigation_logs il
      LEFT JOIN devices d ON il.device_id = d.id
      LEFT JOIN lands l ON il.land_id = l.id
      ORDER BY il.created_at DESC LIMIT ?
    `;
    const params = [parseInt(limit)];
    if (device_id) {
      query += ' AND il.device_id = ?';
      params.push(device_id);
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

