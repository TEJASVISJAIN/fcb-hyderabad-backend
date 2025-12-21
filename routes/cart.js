const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Get cart (works for both logged in and guest users)
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { session_id } = req.query;

    let query = `
      SELECT ci.*, p.name, p.price, p.featured_image, p.slug,
             pv.size, pv.color, pv.price_adjustment
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    `;

    let params = [];
    if (userId) {
      query += ' WHERE ci.user_id = $1';
      params = [userId];
    } else if (session_id) {
      query += ' WHERE ci.session_id = $1';
      params = [session_id];
    } else {
      return res.json({ cart: [] });
    }

    const result = await pool.query(query, params);
    
    // Calculate total
    const cart = result.rows.map(item => ({
      ...item,
      item_total: (parseFloat(item.price) + parseFloat(item.price_adjustment || 0)) * item.quantity
    }));

    const total = cart.reduce((sum, item) => sum + item.item_total, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ cart, total, itemCount });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to cart
router.post('/add', async (req, res) => {
  try {
    const { product_id, variant_id, quantity, session_id } = req.body;
    const userId = req.user?.id;

    if (!product_id || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    // Check product exists and has stock
    const productCheck = await pool.query(
      'SELECT stock_quantity FROM products WHERE id = $1',
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if item already exists in cart
      let existingItem;
      if (userId) {
        existingItem = await client.query(
          'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND ($3::integer IS NULL OR variant_id = $3)',
          [userId, product_id, variant_id]
        );
      } else if (session_id) {
        existingItem = await client.query(
          'SELECT * FROM cart_items WHERE session_id = $1 AND product_id = $2 AND ($3::integer IS NULL OR variant_id = $3)',
          [session_id, product_id, variant_id]
        );
      }

      let result;
      if (existingItem && existingItem.rows.length > 0) {
        // Update quantity
        const newQuantity = existingItem.rows[0].quantity + quantity;
        result = await client.query(
          'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [newQuantity, existingItem.rows[0].id]
        );
      } else {
        // Add new item
        result = await client.query(
          `INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, session_id, product_id, variant_id, quantity]
        );
      }

      await client.query('COMMIT');
      res.json({ cartItem: result.rows[0], message: 'Added to cart successfully!' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update cart item quantity
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;
    const { session_id } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    let query = 'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    let params = [quantity, id];

    // Ensure user can only update their own cart
    if (userId) {
      query += ' AND user_id = $3';
      params.push(userId);
    } else if (session_id) {
      query += ' AND session_id = $3';
      params.push(session_id);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ cartItem: result.rows[0], message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from cart
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { session_id } = req.query;

    let query = 'DELETE FROM cart_items WHERE id = $1';
    let params = [id];

    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    } else if (session_id) {
      query += ' AND session_id = $2';
      params.push(session_id);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear cart
router.delete('/clear/all', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { session_id } = req.query;

    if (userId) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else if (session_id) {
      await pool.query('DELETE FROM cart_items WHERE session_id = $1', [session_id]);
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
