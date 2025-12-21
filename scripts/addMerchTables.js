const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addMerchTables() {
  const client = await pool.connect();
  
  try {
    console.log('🛍️ Creating merchandise store tables...\n');

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        compare_at_price DECIMAL(10, 2),
        category VARCHAR(100) NOT NULL,
        sizes TEXT[],
        colors TEXT[],
        images TEXT[],
        featured_image TEXT,
        stock_quantity INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');

    // Product variants table (for size/color combinations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(50),
        color VARCHAR(50),
        sku VARCHAR(100) UNIQUE,
        stock_quantity INTEGER DEFAULT 0,
        price_adjustment DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, size, color)
      )
    `);
    console.log('✅ Product variants table created');

    // Shopping cart table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, variant_id),
        UNIQUE(session_id, product_id, variant_id)
      )
    `);
    console.log('✅ Cart items table created');

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        shipping_address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(20) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        shipping_fee DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_screenshot TEXT,
        payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
        order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        variant_details JSONB,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Order items table created');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Merchandise store database setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addMerchTables();
