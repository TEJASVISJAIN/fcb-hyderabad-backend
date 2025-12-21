// Fix products table schema - remove base_price constraint
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');

async function fixProductsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing products table schema...\n');

    // Make base_price nullable (in case it still exists)
    await client.query(`
      ALTER TABLE products 
      ALTER COLUMN base_price DROP NOT NULL;
    `);
    console.log('✅ Removed NOT NULL constraint from base_price');

    // Set base_price to price value for existing products
    await client.query(`
      UPDATE products 
      SET base_price = price 
      WHERE base_price IS NULL AND price IS NOT NULL;
    `);
    console.log('✅ Copied price to base_price for existing records');

    console.log('\n🎉 Products table schema fixed!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
    // Don't throw - some of these might already be done
  } finally {
    client.release();
    await pool.end();
  }
}

fixProductsTable();
