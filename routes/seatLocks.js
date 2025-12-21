const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Lock seats for a session (5 minutes)
router.post('/lock', async (req, res) => {
  try {
    const { event_id, session_id, seats_count } = req.body;

    if (!event_id || !session_id || !seats_count) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Clean up expired locks
      await client.query(
        'DELETE FROM seat_locks WHERE expires_at < NOW()'
      );

      // Get current event details and locked seats
      const eventResult = await client.query(
        `SELECT e.total_capacity, e.booked_seats,
                COALESCE(SUM(sl.seats_locked), 0) as locked_seats
         FROM events e
         LEFT JOIN seat_locks sl ON e.id = sl.event_id AND sl.expires_at > NOW()
         WHERE e.id = $1
         GROUP BY e.id, e.total_capacity, e.booked_seats`,
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Event not found' });
      }

      const event = eventResult.rows[0];
      const availableSeats = event.total_capacity - event.booked_seats - event.locked_seats;

      if (availableSeats < seats_count) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Only ${availableSeats} seats available. Some seats may be temporarily reserved by other users.`,
          availableSeats 
        });
      }

      // Create or update lock (5 minutes expiry)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      await client.query(
        `INSERT INTO seat_locks (event_id, session_id, seats_locked, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, session_id)
         DO UPDATE SET seats_locked = $3, locked_at = CURRENT_TIMESTAMP, expires_at = $4`,
        [event_id, session_id, seats_count, expiresAt]
      );

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        message: 'Seats locked successfully',
        expiresAt,
        lockedSeats: seats_count
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error locking seats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Release seat lock
router.post('/unlock', async (req, res) => {
  try {
    const { event_id, session_id } = req.body;

    if (!event_id || !session_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await pool.query(
      'DELETE FROM seat_locks WHERE event_id = $1 AND session_id = $2',
      [event_id, session_id]
    );

    res.json({ success: true, message: 'Seats unlocked' });

  } catch (error) {
    console.error('Error unlocking seats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available seats (considering locks)
router.get('/:eventId/available', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { session_id } = req.query;

    // Clean up expired locks
    await pool.query('DELETE FROM seat_locks WHERE expires_at < NOW()');

    const result = await pool.query(
      `SELECT e.total_capacity, e.booked_seats,
              COALESCE(SUM(CASE WHEN sl.session_id != $2 THEN sl.seats_locked ELSE 0 END), 0) as locked_by_others,
              COALESCE(SUM(CASE WHEN sl.session_id = $2 THEN sl.seats_locked ELSE 0 END), 0) as locked_by_me
       FROM events e
       LEFT JOIN seat_locks sl ON e.id = sl.event_id AND sl.expires_at > NOW()
       WHERE e.id = $1
       GROUP BY e.id, e.total_capacity, e.booked_seats`,
      [eventId, session_id || 'none']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = result.rows[0];
    const available = event.total_capacity - event.booked_seats - event.locked_by_others;

    res.json({
      totalCapacity: event.total_capacity,
      bookedSeats: event.booked_seats,
      lockedByOthers: parseInt(event.locked_by_others),
      lockedByMe: parseInt(event.locked_by_me),
      availableSeats: available
    });

  } catch (error) {
    console.error('Error getting available seats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Extend lock (if user is still on the page)
router.post('/extend', async (req, res) => {
  try {
    const { event_id, session_id } = req.body;

    if (!event_id || !session_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const result = await pool.query(
      `UPDATE seat_locks 
       SET expires_at = $1, locked_at = CURRENT_TIMESTAMP
       WHERE event_id = $2 AND session_id = $3 AND expires_at > NOW()
       RETURNING *`,
      [expiresAt, event_id, session_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active lock found' });
    }

    res.json({ success: true, message: 'Lock extended', expiresAt });

  } catch (error) {
    console.error('Error extending lock:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
