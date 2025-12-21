const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const { category, featured, search } = req.query;
    
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (featured === 'true') {
      query += ` AND is_featured = true`;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const productResult = await pool.query(
      'SELECT * FROM products WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Get variants
    const variantsResult = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1',
      [product.id]
    );

    product.variants = variantsResult.rows;

    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products WHERE is_active = true ORDER BY category'
    );
    res.json({ categories: result.rows.map(r => r.category) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// Create product (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      name, description, price, compare_at_price, category,
      sizes, colors, images, featured_image, stock_quantity,
      is_featured, variants
    } = req.body;

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert product
      const productResult = await client.query(
        `INSERT INTO products 
         (name, slug, description, price, compare_at_price, category, sizes, colors, images, featured_image, stock_quantity, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [name, slug, description, price, compare_at_price, category, sizes, colors, images, featured_image, stock_quantity, is_featured]
      );

      const product = productResult.rows[0];

      // Insert variants if provided
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          await client.query(
            `INSERT INTO product_variants (product_id, size, color, sku, stock_quantity, price_adjustment)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [product.id, variant.size, variant.color, variant.sku, variant.stock_quantity, variant.price_adjustment || 0]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ product, message: 'Product created successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, price, compare_at_price, category,
      sizes, colors, images, featured_image, stock_quantity,
      is_featured, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, compare_at_price = $4,
           category = $5, sizes = $6, colors = $7, images = $8,
           featured_image = $9, stock_quantity = $10, is_featured = $11,
           is_active = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [name, description, price, compare_at_price, category, sizes, colors, images, featured_image, stock_quantity, is_featured, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: result.rows[0], message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products for admin
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
