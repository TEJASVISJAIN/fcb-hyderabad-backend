const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Get all blogs (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const offset = (page - 1) * limit;

    let query, countQuery, params, countParams;

    if (tag) {
      // Filter by tag slug
      query = `SELECT DISTINCT b.*, u.username as author_name, u.email as author_email,
              COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.id IN (
         SELECT bt2.blog_id FROM blog_tags bt2
         JOIN tags t2 ON bt2.tag_id = t2.id
         WHERE t2.slug = $1
       )
       GROUP BY b.id, u.username, u.email
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`;
      params = [tag, limit, offset];

      countQuery = `SELECT COUNT(DISTINCT b.id) FROM blogs b
                    JOIN blog_tags bt ON b.id = bt.blog_id
                    JOIN tags t ON bt.tag_id = t.id
                    WHERE t.slug = $1`;
      countParams = [tag];
    } else {
      // All blogs
      query = `SELECT b.*, u.username as author_name, u.email as author_email,
              COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       GROUP BY b.id, u.username, u.email
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`;
      params = [limit, offset];

      countQuery = 'SELECT COUNT(*) FROM blogs';
      countParams = [];
    }

    const result = await pool.query(query, params);
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
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single blog by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, u.username as author_name, u.email as author_email,
              COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.id = $1
       GROUP BY b.id, u.username, u.email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ blog: result.rows[0] });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

      const { title, content, tags } = req.body;

      const result = await pool.query(
        `INSERT INTO blogs (title, content, author_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [title, content, req.user.id]
      );

      const blog = result.rows[0];

      // Add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
          let tagResult = await pool.query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
          );

          let tagId;
          if (tagResult.rows.length === 0) {
            const newTag = await pool.query(
              'INSERT INTO tags (name) VALUES ($1) RETURNING id',
              [tagName]
            );
            tagId = newTag.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }

          await pool.query(
            'INSERT INTO blog_tags (blog_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [blog.id, tagId]
          );
        }
      }

      res.status(201).json({
        message: 'Blog created successfully',
        blog,
      });
    } catch (error) {
      console.error('Error creating blog:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Update blog (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;

    const result = await pool.query(
      `UPDATE blogs 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [title, content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const blog = result.rows[0];

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      await pool.query('DELETE FROM blog_tags WHERE blog_id = $1', [id]);

      for (const tagName of tags) {
        let tagResult = await pool.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await pool.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await pool.query(
          'INSERT INTO blog_tags (blog_id, tag_id) VALUES ($1, $2)',
          [blog.id, tagId]
        );
      }
    }

    res.json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all tags
router.get('/tags/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json({ tags: result.rows });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
