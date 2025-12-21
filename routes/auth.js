const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user exists
      const userExists = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await pool.query(
        `INSERT INTO users (username, email, password, is_admin) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, is_admin, created_at`,
        [name, email, hashedPassword, false]
      );

      const user = newUser.rows[0];

      // Create token
      const token = jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          name: user.username,
          email: user.email,
          role: user.is_admin ? 'admin' : 'user',
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user exists
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [
        email,
      ]);

      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create token
      const token = jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.username,
          email: user.email,
          role: user.is_admin ? 'admin' : 'user',
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    res.json({ 
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.is_admin ? 'admin' : 'user',
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

module.exports = router;
