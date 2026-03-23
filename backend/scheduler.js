import cron from 'node-cron';
import { db } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class IrrigationScheduler {
  constructor() {
    this.isRunning = false;
    this.pausedSchedules = new Set();
    this.powerStatus = 'normal';
    this.outageStart = null;
    this.activeSequences = new Map(); // sequence_id -> timeout
  }

  // Enhanced power check with user alerts
  async checkPowerStatus() {
    const [rows] = await db.query(`
      SELECT AVG(voltage) as avg_voltage, AVG(current) as avg_current 
      FROM sensor_data 
      WHERE voltage IS NOT NULL 
      ORDER BY created_at DESC LIMIT 10
    `);
    const avgVoltage = rows[0]?.avg_voltage || 0;
    
    if (avgVoltage < 180) {
      if (this.powerStatus === 'normal') {
        this.powerStatus = 'outage';
        this.outageStart = new Date();
        console.log('⚡ POWER OUTAGE detected!');
        await this.pauseAllSchedules('power_outage');
        // User alert
        await db.query(`
          INSERT INTO outage_alerts (message, severity) VALUES (?, 'critical')
        `, ['Power outage detected - all irrigation paused. Monitoring for resume.']);
      }
      return false;
    } else {
      if (this.powerStatus === 'outage') {
        this.powerStatus = 'normal';
        console.log('⚡ Power restored! Checking for auto-resume...');
        await db.query(`
          INSERT INTO outage_alerts (message, severity) VALUES (?, 'info')
        `, ['Power restored - resuming interrupted irrigation sequences.']);
        await this.resumePausedSchedules();
      }
      return true;
    }
  }

  // Pause schedules and log
  async pauseAllSchedules(reason) {
    await db.query(`
      UPDATE schedules SET status = 'paused', status_message = ? WHERE status = 'active'
    `, [reason]);
    this.pausedSchedules.add(reason);
  }

  // Resume with sequence recalc
  async resumePausedSchedules() {
    const [paused] = await db.query(`
      SELECT s.*, ps.name as sequence_name 
      FROM schedules s 
      LEFT JOIN pump_sequences ps ON s.sequence_id = ps.id 
      WHERE s.status = 'paused'
    `);
    
    for (const schedule of paused) {
      const nextRun = this.calculateNextRun(schedule);
      await db.query(`
        UPDATE schedules SET status = 'active', next_run = ?, status_message = NULL 
        WHERE id = ?
      `, [nextRun, schedule.id]);
      
      // Log resume
      await db.query(`
        INSERT INTO irrigation_logs (device_id, action, reason, resume_from_outage) 
        VALUES (?, 'start', 'power_resume', TRUE)
      `, [schedule.device_id]);
    }
    this.pausedSchedules.clear();
  }

  // Anytime irrigation start
  async startIrrigationNow(deviceId, duration, reason, aiConfidence = null, sequenceId = null) {
    await this.executeIrrigation(deviceId, duration, reason, aiConfidence, true, sequenceId);
  }

  // Enhanced AI with factors and sequences
  async aiAutoIrrigate() {
    if (this.powerStatus !== 'normal') return;

    const [landsData] = await db.query(`
      SELECT 
        d.land_id,
        AVG(s.soil) as avg_soil,
        AVG(s.temperature) as avg_temp,
        AVG(s.humidity) as avg_hum,
        AVG(s.voltage) as avg_voltage
      FROM sensor_data s
      JOIN devices d ON s.device_id = d.id
      WHERE d.type = 'sensor' AND s.created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND s.soil IS NOT NULL
      GROUP BY d.land_id
      HAVING avg_soil < 1600
    `);

    for (const land of landsData) {
      if (!land.land_id) continue;

      // Calc factors
      let duration = 20; // base
      let confidence = 0;
      const factors = {};

      if (land.avg_soil < 1200) confidence += 0.4;
      if (land.avg_temp > 30) {
        duration *= 1.2;
        factors.temp_multiplier = 1.2;
        confidence += 0.2;
      }
      if (land.avg_hum < 40) {
        duration *= 0.8;
        factors.humidity_factor = 0.8;
        confidence += 0.1;
      }
      confidence = Math.min(1, confidence);

      // Log AI decision
      await db.query(`
        INSERT INTO ai_decisions (land_id, avg_soil, avg_temp, avg_humidity, voltage_avg, ai_confidence, factors, recommended_action, duration_suggested)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'irrigate', ?)
      `, [land.land_id, land.avg_soil, land.avg_temp, land.avg_hum, land.avg_voltage, confidence, JSON.stringify(factors), duration]);

      if (confidence > 0.7) {
        // Check for sequence
        const [seq] = await db.query(`
          SELECT id FROM pump_sequences WHERE land_id = ? AND ai_enabled = TRUE LIMIT 1
        `, [land.land_id]);
        if (seq.length > 0) {
          await this.executeSequence(seq[0].id, confidence);
        } else {
          // Single pump
          const [pump] = await db.query(`
            SELECT id FROM devices WHERE type = 'pump' AND land_id = ? LIMIT 1
          `, [land.land_id]);
          if (pump.length) {
            await this.startIrrigationNow(pump[0].id, Math.round(duration), 'ai_moisture_low', confidence);
          }
        }
      }
    }
  }

  // Execute full sequence
  async executeSequence(sequenceId, confidence) {
    const [schedules] = await db.query(`
      SELECT * FROM schedules WHERE sequence_id = ? ORDER BY sequence_order
    `, [sequenceId]);

    let delay = 0;
    for (const sch of schedules) {
      setTimeout(() => {
        this.executeIrrigation(sch.device_id, sch.duration_minutes, 'ai_sequence', confidence, false, sequenceId);
      }, delay * 60000);
      delay += sch.duration_minutes || 5;
    }
    console.log(`🔄 Sequence ${sequenceId} started (AI confidence: ${confidence})`);
  }

  // Core execution (now supports immediate flag)
  async executeIrrigation(deviceId, duration, reason, aiConfidence = null, isImmediate = false, sequenceId = null) {
    // Log start with power status
    const [power] = await db.query(`SELECT power_status FROM devices WHERE id = ?`, [deviceId]);
    await db.query(`
      INSERT INTO irrigation_logs (
        device_id, action, reason, duration_minutes, ai_confidence, sequence_id, power_status_at_start
      ) VALUES (?, 'start', ?, ?, ?, ?, ?)
    `, [deviceId, reason, duration, aiConfidence, sequenceId, power[0]?.power_status || 'normal']);

    const status = reason.includes('pump') ? 'running' : 'active';
    await db.query(`UPDATE devices SET status = ? WHERE id = ?`, [status, deviceId]);
    console.log(`💧 ${reason} on ${deviceId} for ${duration}min${isImmediate ? ' (NOW)' : ''} conf:${aiConfidence}`);

    // Stop timer
    setTimeout(async () => {
      await db.query(`UPDATE devices SET status = 'idle' WHERE id = ?`, [deviceId]);
      await db.query(`INSERT INTO irrigation_logs (device_id, action, reason, duration_minutes, sequence_id) VALUES (?, 'stop', ?, ?)`, 
        [deviceId, reason, duration]);
      console.log(`⏹️ Stopped ${deviceId}`);
    }, duration * 60 * 1000);
  }

  // Main loop every minute
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    cron.schedule('* * * * *', async () => {
      await this.checkPowerStatus();
      if (this.powerStatus !== 'normal') return;

      const [activeSchedules] = await db.query(`
        SELECT * FROM schedules 
        WHERE status = 'active' 
        AND (start_datetime IS NULL OR start_datetime <= NOW())
        AND (next_run IS NULL OR next_run <= NOW())
        ORDER BY sequence_id, sequence_order
      `);

      for (const schedule of activeSchedules) {
        await this.executeIrrigation(schedule.device_id, schedule.duration_minutes, 'scheduled');
        const nextRun = this.calculateNextRun(schedule);
        await db.query("UPDATE schedules SET next_run = ? WHERE id = ?", [nextRun, schedule.id]);
      }

      if (new Date().getMinutes() % 5 === 0) await this.aiAutoIrrigate();
    });

    cron.schedule('*/30 * * * * *', () => this.checkPowerStatus());

    console.log('🕐 Enhanced Irrigation Scheduler (AI/Sequences/Power) started');
  }

  calculateNextRun(schedule) {
    const now = new Date();
    if (schedule.start_datetime && schedule.start_datetime > now) return schedule.start_datetime;

    const todayStart = new Date(now);
    const [h, m] = schedule.start_time.split(':');
    todayStart.setHours(parseInt(h), parseInt(m), 0, 0);

    if (schedule.repeat_pattern === 'daily') {
      return todayStart > now ? todayStart : new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() + 60 * 60 * 1000); // hourly fallback
  }

  stop() {
    this.isRunning = false;
  }
}

export default IrrigationScheduler;

