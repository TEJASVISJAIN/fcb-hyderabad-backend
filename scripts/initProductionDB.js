// Initialize production database with all tables
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');

async function initProductionDB() {
  const client = await pool.connect();
  
  try {
    console.log('🔵🔴 Initializing Production Database...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Create blogs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Blogs table created');

    // Create tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);
    console.log('✅ Tags table created');

    // Create blog_tags junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (blog_id, tag_id)
      );
    `);
    console.log('✅ Blog_tags table created');

    // Create comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Comments table created');

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        venue_name VARCHAR(255),
        total_seats INTEGER NOT NULL DEFAULT 50,
        available_seats INTEGER NOT NULL DEFAULT 50,
        price DECIMAL(10, 2) DEFAULT 0,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Events table created');

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        seats_booked INTEGER NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_screenshot VARCHAR(500),
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Bookings table created');

    // Create seat_locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_locks (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER,
        session_id VARCHAR(255) NOT NULL,
        seats_locked INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Seat_locks table created');

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        base_price DECIMAL(10, 2) NOT NULL,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Products table created');

    // Create product_variants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(50),
        color VARCHAR(50),
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL,
        sku VARCHAR(100) UNIQUE
      );
    `);
    console.log('✅ Product_variants table created');

    // Create cart_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Cart_items table created');

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_screenshot VARCHAR(500),
        payment_status VARCHAR(50) DEFAULT 'pending',
        shipping_address TEXT,
        order_status VARCHAR(50) DEFAULT 'processing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Orders table created');

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        product_name VARCHAR(255),
        variant_details VARCHAR(255)
      );
    `);
    console.log('✅ Order_items table created');

    console.log('\n🎉 Production database initialized successfully!');
    console.log('Next step: Run seed scripts to populate data\n');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initProductionDB();
