// Fix cart_items table to add product_id column
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');

async function fixCartSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing cart_items schema...');

    // Add product_id column to cart_items
    await client.query(`
      ALTER TABLE cart_items 
      ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added product_id column to cart_items');

    console.log('\n🎉 Schema fix completed!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCartSchema();
