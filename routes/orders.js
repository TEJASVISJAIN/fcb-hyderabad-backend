const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/payment-screenshots';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'order-payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

// Generate order number
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VB${year}${month}${day}${random}`;
}

// Create order
router.post('/', upload.single('payment_screenshot'), async (req, res) => {
  try {
    const {
      customer_name, customer_email, customer_phone,
      shipping_address, city, state, pincode,
      payment_method, notes, cart_items
    } = req.body;

    const userId = req.user?.id;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city || !state || !pincode) {
      return res.status(400).json({ message: 'All shipping details are required' });
    }

    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Parse cart items
      const items = JSON.parse(cart_items);

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const productResult = await client.query(
          'SELECT * FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        const product = productResult.rows[0];
        let variant = null;
        let price = parseFloat(product.price);

        if (item.variant_id) {
          const variantResult = await client.query(
            'SELECT * FROM product_variants WHERE id = $1',
            [item.variant_id]
          );
          if (variantResult.rows.length > 0) {
            variant = variantResult.rows[0];
            price += parseFloat(variant.price_adjustment || 0);
          }
        }

        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          variant_details: variant ? { size: variant.size, color: variant.color } : null,
          quantity: item.quantity,
          unit_price: price,
          total_price: itemTotal
        });
      }

      // Calculate shipping (free for orders above 2000)
      const shippingFee = subtotal >= 2000 ? 0 : 100;
      const totalAmount = subtotal + shippingFee;

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Insert order
      const paymentScreenshot = req.file ? `/uploads/payment-screenshots/${req.file.filename}` : null;
      
      const orderResult = await client.query(
        `INSERT INTO orders 
         (order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address, city, state, pincode, subtotal, shipping_fee, total_amount,
          payment_method, payment_screenshot, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [orderNumber, userId, customer_name, customer_email, customer_phone,
         shipping_address, city, state, pincode, subtotal, shippingFee, totalAmount,
         payment_method, paymentScreenshot, notes]
      );

      const order = orderResult.rows[0];

      // Insert order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items 
           (order_id, product_id, product_name, variant_details, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [order.id, item.product_id, item.product_name, item.variant_details,
           item.quantity, item.unit_price, item.total_price]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        order,
        message: `Order placed successfully! Order number: ${orderNumber}`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'id', oi.id,
                'product_name', oi.product_name,
                'variant_details', oi.variant_details,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order by order number
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order.id]
    );

    order.items = itemsResult.rows;

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// Get all orders (admin)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT o.*, 
             json_agg(json_build_object(
               'id', oi.id,
               'product_name', oi.product_name,
               'variant_details', oi.variant_details,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price,
               'total_price', oi.total_price
             )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    const params = [];
    if (status) {
      query += ' WHERE o.order_status = $1';
      params.push(status);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (admin)
router.put('/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET order_status = COALESCE($1, order_status),
           payment_status = COALESCE($2, payment_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [order_status, payment_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order: result.rows[0], message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
