const pool = require('../config/database');

async function fixCapVariants() {
  try {
    console.log('🔧 Fixing FCB Hyderabad Cap variants...');
    
    // Get the cap product
    const capResult = await pool.query(
      "SELECT id, name, sizes, colors FROM products WHERE slug = 'fcb-hyderabad-cap'"
    );
    
    if (capResult.rows.length === 0) {
      console.log('❌ Cap product not found');
      process.exit(1);
    }
    
    const cap = capResult.rows[0];
    console.log('Cap:', cap);
    
    // Delete existing variants
    await pool.query('DELETE FROM product_variants WHERE product_id = $1', [cap.id]);
    console.log('✅ Deleted old variants');
    
    // Create new variants
    const sizes = cap.sizes || ['One Size'];
    const colors = cap.colors || ['Blue/Red'];
    
    for (const size of sizes) {
      for (const color of colors) {
        const sku = `CAP-${size.replace(/\s+/g, '')}-${color.replace(/\s+/g, '').substring(0, 3).toUpperCase()}`;
        
        await pool.query(
          `INSERT INTO product_variants (product_id, size, color, stock_quantity, price_adjustment, sku)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [cap.id, size, color, 50, 0, sku]
        );
        
        console.log(`✅ Created variant: ${size} / ${color} (${sku})`);
      }
    }
    
    console.log('\n🎉 Cap variants fixed!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixCapVariants();
