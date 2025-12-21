const pool = require('../config/database');

async function fixProductSlugs() {
  try {
    console.log('🔧 Fixing product slugs in database...');
    
    // Get all products without slugs
    const result = await pool.query('SELECT id, name FROM products WHERE slug IS NULL');
    
    console.log(`Found ${result.rows.length} products without slugs`);
    
    for (const product of result.rows) {
      // Generate slug from name
      const slug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      console.log(`Updating "${product.name}" with slug: ${slug}`);
      
      await pool.query(
        'UPDATE products SET slug = $1 WHERE id = $2',
        [slug, product.id]
      );
    }
    
    console.log('✅ All product slugs fixed!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing slugs:', error);
    await pool.end();
    process.exit(1);
  }
}

fixProductSlugs();
