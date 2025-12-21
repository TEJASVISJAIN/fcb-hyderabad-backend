const pool = require('../config/database');

const products = [
  {
    name: 'FCB Hyderabad Home Jersey 2024',
    slug: 'fcb-hyderabad-home-jersey-2024',
    description: 'Official FC Barcelona Hyderabad Peña home jersey. Premium quality fabric with moisture-wicking technology. Features the iconic Blaugrana colors with Hyderabad Peña branding.',
    price: 1499,
    compare_at_price: 1999,
    category: 'Jerseys',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Blaugrana', 'Navy Blue'],
    images: [
      '/images/products/jersey-home-1.jpg',
      '/images/products/jersey-home-2.jpg',
      '/images/products/jersey-home-3.jpg'
    ],
    featured_image: '/images/products/jersey-home-1.jpg',
    stock_quantity: 150,
    is_featured: true,
    is_active: true
  },
  {
    name: 'FCB Hyderabad Away Jersey 2024',
    slug: 'fcb-hyderabad-away-jersey-2024',
    description: 'Official FC Barcelona Hyderabad Peña away jersey. Sleek design with breathable fabric for maximum comfort. Perfect for match days and casual wear.',
    price: 1499,
    compare_at_price: 1999,
    category: 'Jerseys',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Gold'],
    images: [
      '/images/products/jersey-away-1.jpg',
      '/images/products/jersey-away-2.jpg'
    ],
    featured_image: '/images/products/jersey-away-1.jpg',
    stock_quantity: 120,
    is_featured: true,
    is_active: true
  },
  {
    name: 'Visca el Barça Scarf',
    slug: 'visca-el-barca-scarf',
    description: 'Premium quality FC Barcelona Hyderabad scarf. Double-sided design with Blaugrana colors and "Visca el Barça" text. Perfect for match days!',
    price: 499,
    compare_at_price: 699,
    category: 'Accessories',
    sizes: ['One Size'],
    colors: ['Blaugrana', 'Blue/Red/Gold'],
    images: [
      '/images/products/scarf-1.jpg',
      '/images/products/scarf-2.jpg'
    ],
    featured_image: '/images/products/scarf-1.jpg',
    stock_quantity: 200,
    is_featured: true,
    is_active: true
  },
  {
    name: 'FCB Hyderabad Cap',
    slug: 'fcb-hyderabad-cap',
    description: 'Stylish snapback cap with embroidered FC Barcelona Hyderabad logo. Adjustable strap for perfect fit. UV protection fabric.',
    price: 599,
    compare_at_price: 799,
    category: 'Accessories',
    sizes: ['Adjustable'],
    colors: ['Navy Blue', 'Black', 'Red'],
    images: [
      '/images/products/cap-1.jpg',
      '/images/products/cap-2.jpg',
      '/images/products/cap-3.jpg'
    ],
    featured_image: '/images/products/cap-1.jpg',
    stock_quantity: 180,
    is_featured: false,
    is_active: true
  },
  {
    name: 'FCB Training T-Shirt',
    slug: 'fcb-training-tshirt',
    description: 'Comfortable training t-shirt with FC Barcelona Hyderabad branding. Made from breathable, quick-dry fabric. Perfect for training sessions and casual wear.',
    price: 799,
    compare_at_price: 999,
    category: 'Apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy Blue', 'Black', 'Red', 'White'],
    images: [
      '/images/products/tshirt-1.jpg',
      '/images/products/tshirt-2.jpg'
    ],
    featured_image: '/images/products/tshirt-1.jpg',
    stock_quantity: 250,
    is_featured: false,
    is_active: true
  },
  {
    name: 'Barça Hyderabad Hoodie',
    slug: 'barca-hyderabad-hoodie',
    description: 'Premium quality hoodie with fleece lining. Features FC Barcelona Hyderabad logo and "Més que un club" print. Perfect for winter match screenings.',
    price: 1899,
    compare_at_price: 2499,
    category: 'Apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy Blue', 'Black', 'Maroon'],
    images: [
      '/images/products/hoodie-1.jpg',
      '/images/products/hoodie-2.jpg',
      '/images/products/hoodie-3.jpg'
    ],
    featured_image: '/images/products/hoodie-1.jpg',
    stock_quantity: 100,
    is_featured: true,
    is_active: true
  },
  {
    name: 'FCB Gym Bag',
    slug: 'fcb-gym-bag',
    description: 'Spacious gym bag with multiple compartments. Water-resistant material with FC Barcelona Hyderabad branding. Includes shoe compartment and water bottle holder.',
    price: 1299,
    compare_at_price: 1699,
    category: 'Accessories',
    sizes: ['One Size'],
    colors: ['Navy Blue', 'Black'],
    images: [
      '/images/products/bag-1.jpg',
      '/images/products/bag-2.jpg'
    ],
    featured_image: '/images/products/bag-1.jpg',
    stock_quantity: 80,
    is_featured: false,
    is_active: true
  },
  {
    name: 'Barça Keychain',
    slug: 'barca-keychain',
    description: 'Metal keychain with FC Barcelona Hyderabad logo. Premium finish with enamel colors. Perfect gift for fellow culés!',
    price: 199,
    compare_at_price: 299,
    category: 'Accessories',
    sizes: ['One Size'],
    colors: ['Silver', 'Gold'],
    images: [
      '/images/products/keychain-1.jpg'
    ],
    featured_image: '/images/products/keychain-1.jpg',
    stock_quantity: 300,
    is_featured: false,
    is_active: true
  },
  {
    name: 'FCB Water Bottle',
    slug: 'fcb-water-bottle',
    description: 'Stainless steel water bottle with FC Barcelona Hyderabad branding. 750ml capacity with leak-proof cap. Keeps drinks cold for 24 hours.',
    price: 599,
    compare_at_price: 799,
    category: 'Accessories',
    sizes: ['750ml'],
    colors: ['Navy Blue', 'Red', 'Black'],
    images: [
      '/images/products/bottle-1.jpg',
      '/images/products/bottle-2.jpg'
    ],
    featured_image: '/images/products/bottle-1.jpg',
    stock_quantity: 150,
    is_featured: false,
    is_active: true
  },
  {
    name: 'Visca el Barça Poster Set',
    slug: 'visca-el-barca-poster-set',
    description: 'Set of 3 premium quality posters featuring iconic FC Barcelona moments and Hyderabad Peña branding. Size: 12x18 inches each. Matte finish.',
    price: 499,
    compare_at_price: 699,
    category: 'Memorabilia',
    sizes: ['12x18 inches'],
    colors: ['Full Color'],
    images: [
      '/images/products/poster-1.jpg',
      '/images/products/poster-2.jpg',
      '/images/products/poster-3.jpg'
    ],
    featured_image: '/images/products/poster-1.jpg',
    stock_quantity: 100,
    is_featured: false,
    is_active: true
  },
  {
    name: 'FCB Hyderabad Sticker Pack',
    slug: 'fcb-hyderabad-sticker-pack',
    description: 'Pack of 10 waterproof stickers featuring FC Barcelona Hyderabad logos and designs. Perfect for laptops, water bottles, and more!',
    price: 149,
    compare_at_price: 199,
    category: 'Memorabilia',
    sizes: ['Pack of 10'],
    colors: ['Multi-color'],
    images: [
      '/images/products/stickers-1.jpg'
    ],
    featured_image: '/images/products/stickers-1.jpg',
    stock_quantity: 500,
    is_featured: false,
    is_active: true
  },
  {
    name: 'Barça Phone Case',
    slug: 'barca-phone-case',
    description: 'Durable phone case with FC Barcelona Hyderabad design. Available for iPhone and Samsung models. Shock-proof with raised edges for screen protection.',
    price: 399,
    compare_at_price: 599,
    category: 'Accessories',
    sizes: ['iPhone 13/14', 'iPhone 15', 'Samsung S21/S22', 'Samsung S23/S24'],
    colors: ['Clear', 'Navy Blue', 'Black'],
    images: [
      '/images/products/phone-case-1.jpg',
      '/images/products/phone-case-2.jpg'
    ],
    featured_image: '/images/products/phone-case-1.jpg',
    stock_quantity: 200,
    is_featured: false,
    is_active: true
  }
];

async function seedMerch() {
  const client = await pool.connect();
  
  try {
    console.log('🛍️ Starting merchandise seeding...\n');

    await client.query('BEGIN');

    // Clear existing products and variants
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM products');
    console.log('✅ Cleared existing products\n');

    let totalProducts = 0;
    let totalVariants = 0;

    for (const product of products) {
      // Insert product
      const result = await client.query(
        `INSERT INTO products 
         (name, slug, description, price, compare_at_price, category, sizes, colors, 
          images, featured_image, stock_quantity, is_featured, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          product.name, product.slug, product.description, product.price,
          product.compare_at_price, product.category, product.sizes,
          product.colors, product.images, product.featured_image,
          product.stock_quantity, product.is_featured, product.is_active
        ]
      );

      const productId = result.rows[0].id;
      totalProducts++;
      console.log(`✅ Created: ${product.name}`);

      // Create variants for each size-color combination
      for (const size of product.sizes) {
        for (const color of product.colors) {
          const sku = `${product.slug}-${size.toLowerCase().replace(/\s+/g, '-')}-${color.toLowerCase().replace(/\s+/g, '-')}`;
          const variantStock = Math.floor(product.stock_quantity / (product.sizes.length * product.colors.length));

          await client.query(
            `INSERT INTO product_variants 
             (product_id, size, color, sku, stock_quantity, price_adjustment)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [productId, size, color, sku, variantStock, 0]
          );
          totalVariants++;
        }
      }
    }

    await client.query('COMMIT');
    
    console.log(`\n🎉 Seeding complete!`);
    console.log(`📦 Created ${totalProducts} products`);
    console.log(`🎨 Created ${totalVariants} product variants`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding merchandise:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedMerch();
