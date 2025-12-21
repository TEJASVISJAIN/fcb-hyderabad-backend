const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Helper function to create slug
const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// Get all published blogs (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, u.name as author_name, u.email as author_email,
             array_agg(DISTINCT t.name) as tags
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      LEFT JOIN blog_tags bt ON b.id = bt.blog_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.published = true
    `;

    const params = [];
    
    if (tag) {
      query += ` AND EXISTS (
        SELECT 1 FROM blog_tags bt2
        JOIN tags t2 ON bt2.tag_id = t2.id
        WHERE bt2.blog_id = b.id AND t2.slug = $1
      )`;
      params.push(tag);
    }

    query += ` GROUP BY b.id, u.name, u.email
               ORDER BY b.created_at DESC
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM blogs WHERE published = true';
    const countParams = [];
    
    if (tag) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM blog_tags bt
        JOIN tags t ON bt.tag_id = t.id
        WHERE bt.blog_id = blogs.id AND t.slug = $1
      )`;
      countParams.push(tag);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      blogs: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single blog by slug (public)
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT b.*, u.name as author_name, u.email as author_email,
              array_agg(DISTINCT t.name) as tags
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.slug = $1 AND b.published = true
       GROUP BY b.id, u.name, u.email`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Increment views
    await pool.query(
      'UPDATE blogs SET views = views + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ blog: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all blogs (admin only - includes unpublished)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name as author_name, u.email as author_email,
              array_agg(DISTINCT t.name) as tags
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       GROUP BY b.id, u.name, u.email
       ORDER BY b.created_at DESC`
    );

    res.json({ blogs: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create blog (admin only)
router.post(
  '/',
  auth,
  adminAuth,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, excerpt, cover_image, published, tags } = req.body;
      const slug = createSlug(title);

      // Check if slug exists
      const slugExists = await pool.query(
        'SELECT * FROM blogs WHERE slug = $1',
        [slug]
      );

      if (slugExists.rows.length > 0) {
        return res.status(400).json({ message: 'A blog with similar title already exists' });
      }

      const result = await pool.query(
        `INSERT INTO blogs (title, slug, content, excerpt, cover_image, author_id, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, slug, content, excerpt, cover_image, req.user.id, published || false]
      );

      const blog = result.rows[0];

      // Add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
          const tagSlug = createSlug(tagName);
          
          // Get or create tag
          let tagResult = await pool.query(
            'SELECT id FROM tags WHERE slug = $1',
            [tagSlug]
          );

          let tagId;
          if (tagResult.rows.length === 0) {
            const newTag = await pool.query(
              'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
              [tagName, tagSlug]
            );
            tagId = newTag.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }

          // Link tag to blog
          await pool.query(
            'INSERT INTO blog_tags (blog_id, tag_id) VALUES ($1, $2)',
            [blog.id, tagId]
          );
        }
      }

      res.status(201).json({
        message: 'Blog created successfully',
        blog,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update blog (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, cover_image, published, tags } = req.body;

    let slug;
    if (title) {
      slug = createSlug(title);
      
      // Check if new slug conflicts with other blogs
      const slugExists = await pool.query(
        'SELECT * FROM blogs WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists.rows.length > 0) {
        return res.status(400).json({ message: 'A blog with similar title already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE blogs 
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           content = COALESCE($3, content),
           excerpt = COALESCE($4, excerpt),
           cover_image = COALESCE($5, cover_image),
           published = COALESCE($6, published),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, slug, content, excerpt, cover_image, published, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove existing tags
      await pool.query('DELETE FROM blog_tags WHERE blog_id = $1', [id]);

      // Add new tags
      for (const tagName of tags) {
        const tagSlug = createSlug(tagName);
        
        let tagResult = await pool.query(
          'SELECT id FROM tags WHERE slug = $1',
          [tagSlug]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await pool.query(
            'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, tagSlug]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await pool.query(
          'INSERT INTO blog_tags (blog_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }

    res.json({
      message: 'Blog updated successfully',
      blog: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete blog (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM blogs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tags
router.get('/tags/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, COUNT(bt.blog_id) as blog_count
       FROM tags t
       LEFT JOIN blog_tags bt ON t.id = bt.tag_id
       GROUP BY t.id
       ORDER BY t.name`
    );

    res.json({ tags: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
