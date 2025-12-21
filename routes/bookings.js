const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/payment-screenshots';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for payment screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
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
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF) or PDF are allowed!'));
    }
  }
});

// Create booking with payment screenshot
router.post(
  '/',
  upload.single('payment_screenshot'),
  [
    body('event_id').isInt().withMessage('Valid event ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('number_of_people').isInt({ min: 1 }).withMessage('Number of people must be at least 1'),
  ],
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, name, email, phone, number_of_people, notes } = req.body;
      const userId = req.user?.id || null;

      await client.query('BEGIN');

      // Check if event exists and has capacity
      const eventResult = await client.query(
        `SELECT * FROM events WHERE id = $1 AND status = 'upcoming'`,
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Event not found or not available' });
      }

      const event = eventResult.rows[0];
      const availableSeats = event.total_capacity - event.booked_seats;

      if (availableSeats < parseInt(number_of_people)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Not enough seats available. Only ${availableSeats} seats remaining.` 
        });
      }

      if (!req.file) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Payment screenshot is required' });
      }

      // Calculate payment amount
      const paymentAmount = parseFloat(event.price) * parseInt(number_of_people);
      const paymentScreenshot = `/uploads/payment-screenshots/${req.file.filename}`;

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          event_id, user_id, name, email, phone, number_of_people,
          payment_screenshot, payment_amount, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          event_id,
          userId,
          name,
          email,
          phone,
          number_of_people,
          paymentScreenshot,
          paymentAmount,
          notes,
        ]
      );

      // Update booked seats
      await client.query(
        `UPDATE events 
         SET booked_seats = booked_seats + $1
         WHERE id = $2`,
        [number_of_people, event_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Booking created successfully! Awaiting confirmation.',
        booking: bookingResult.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      
      // Delete uploaded file if booking failed
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// Get user's bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, e.title as event_title, e.event_date, e.venue_name
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel booking
router.put('/:id/cancel', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get booking details
    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // Update booking status
    await client.query(
      `UPDATE bookings 
       SET booking_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );

    // Free up seats
    await client.query(
      `UPDATE events 
       SET booked_seats = booked_seats - $1
       WHERE id = $2`,
      [booking.number_of_people, booking.event_id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
