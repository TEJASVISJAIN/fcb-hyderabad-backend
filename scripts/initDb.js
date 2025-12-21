const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔵🔴 Initializing Visca Barça database...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create blogs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image VARCHAR(500),
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        published BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Blogs table created');

    // Create comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table created');

    // Create tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tags table created');

    // Create blog_tags junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (blog_id, tag_id)
      )
    `);
    console.log('✅ Blog tags table created');

    // Check if admin exists
    const adminCheck = await client.query(
      'SELECT * FROM users WHERE role = $1',
      ['admin']
    );

    if (adminCheck.rows.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        10
      );
      
      await client.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        [
          'Peña Admin',
          process.env.ADMIN_EMAIL || 'admin@viscabarca.com',
          hashedPassword,
          'admin'
        ]
      );
      console.log('✅ Default admin user created');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@viscabarca.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create some default tags
    const defaultTags = [
      { name: 'Match Updates', slug: 'match-updates' },
      { name: 'La Liga', slug: 'la-liga' },
      { name: 'Champions League', slug: 'champions-league' },
      { name: 'Peña Events', slug: 'pena-events' },
      { name: 'Player News', slug: 'player-news' },
      { name: 'Transfer News', slug: 'transfer-news' }
    ];

    for (const tag of defaultTags) {
      await client.query(
        `INSERT INTO tags (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [tag.name, tag.slug]
      );
    }
    console.log('✅ Default tags created');

    console.log('🎉 Database initialization complete!');
    console.log('🔵🔴 Visca el Barça! 🔴🔵');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

initDatabase();
