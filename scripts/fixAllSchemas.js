// Comprehensive database schema fixes
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');

async function fixAllSchemas() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing all database schemas...\n');

    // Fix products table - add missing columns
    console.log('Fixing products table...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS sizes TEXT[],
      ADD COLUMN IF NOT EXISTS colors TEXT[],
      ADD COLUMN IF NOT EXISTS images TEXT[],
      ADD COLUMN IF NOT EXISTS featured_image VARCHAR(500),
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Products table fixed');

    // Update base_price to price for existing products (copy data if exists)
    await client.query(`
      UPDATE products 
      SET price = base_price 
      WHERE price IS NULL AND base_price IS NOT NULL;
    `);
    console.log('✅ Migrated base_price to price');

    // Fix cart_items table - add product_id
    console.log('\nFixing cart_items table...');
    await client.query(`
      ALTER TABLE cart_items 
      ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
    `);
    console.log('✅ Cart_items table fixed');

    // Update existing cart_items to have product_id from variant_id
    await client.query(`
      UPDATE cart_items ci
      SET product_id = pv.product_id
      FROM product_variants pv
      WHERE ci.variant_id = pv.id AND ci.product_id IS NULL;
    `);
    console.log('✅ Updated existing cart items with product_id');

    // Fix product_variants table - rename price to price_adjustment
    console.log('\nFixing product_variants table...');
    const variantColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_variants';
    `);
    const hasPrice = variantColumns.rows.some(row => row.column_name === 'price');
    const hasPriceAdjustment = variantColumns.rows.some(row => row.column_name === 'price_adjustment');

    if (hasPrice && !hasPriceAdjustment) {
      await client.query(`
        ALTER TABLE product_variants 
        RENAME COLUMN price TO price_adjustment;
      `);
      console.log('✅ Renamed price to price_adjustment in product_variants');
    } else if (!hasPriceAdjustment) {
      await client.query(`
        ALTER TABLE product_variants 
        ADD COLUMN IF NOT EXISTS price_adjustment DECIMAL(10, 2) DEFAULT 0;
      `);
      console.log('✅ Added price_adjustment to product_variants');
    } else {
      console.log('✅ Product_variants already has price_adjustment');
    }

    console.log('\n🎉 All schema fixes completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing schemas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllSchemas();
