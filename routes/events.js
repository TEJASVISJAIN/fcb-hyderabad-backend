const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-screenshots/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all upcoming events (public)
router.get('/upcoming', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*
       FROM events e
       WHERE e.event_date >= NOW()
       ORDER BY e.event_date ASC`
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single event by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*
       FROM events e
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get real-time seat availability (public - for live validation)
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Clean up expired locks first
    await pool.query('DELETE FROM seat_locks WHERE expires_at < NOW()');
    
    const result = await pool.query(
      `SELECT e.total_seats, 
              (e.total_seats - e.available_seats) as booked_seats,
              COALESCE(SUM(sl.seats_locked), 0) as locked_seats,
              (e.available_seats - COALESCE(SUM(sl.seats_locked), 0)) as available_now
       FROM events e
       LEFT JOIN seat_locks sl ON e.id = sl.event_id AND sl.expires_at > NOW()
       WHERE e.id = $1
       GROUP BY e.id, e.total_seats, e.available_seats`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not available' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all events (admin only)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*,
              (e.total_seats - e.available_seats) as booked_seats,
              COUNT(b.id) as total_bookings
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id
       GROUP BY e.id
       ORDER BY e.event_date DESC`
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching admin events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create event (admin only)
router.post(
  '/',
  auth,
  adminAuth,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('event_date').isISO8601().withMessage('Valid date is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('total_seats').isInt({ min: 1 }).withMessage('Valid capacity is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        description,
        location,
        venue_name,
        event_date,
        price,
        total_seats,
        image_url,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO events (
          title, description, location, venue_name, event_date, price, 
          total_seats, available_seats, image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
        RETURNING *`,
        [
          title,
          description,
          location,
          venue_name,
          event_date,
          price,
          total_seats,
          image_url,
        ]
      );

      res.status(201).json({
        message: 'Event created successfully',
        event: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);
// Update event (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      venue_name,
      event_date,
      price,
      total_seats,
      image_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           venue_name = COALESCE($4, venue_name),
           event_date = COALESCE($5, event_date),
           price = COALESCE($6, price),
           total_seats = COALESCE($7, total_seats),
           image_url = COALESCE($8, image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        title,
        description,
        location,
        venue_name,
        event_date,
        price,
        total_seats,
        image_url,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete event (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get event bookings (admin only)
router.get('/:id/bookings', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, u.email as user_email
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.event_id = $1
       ORDER BY b.created_at DESC`,
      [id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status (admin only)
router.put('/bookings/:bookingId/status', auth, adminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE bookings 
       SET booking_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      message: 'Booking status updated',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
