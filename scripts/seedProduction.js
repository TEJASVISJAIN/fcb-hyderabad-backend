// Seed production database with initial data
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedProduction() {
  const client = await pool.connect();
  
  try {
    console.log('🔵🔴 Seeding Production Database...\n');

    // 1. Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await client.query(
      `INSERT INTO users (username, email, password, is_admin) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id`,
      ['admin', 'admin@fcbhyderabad.com', hashedPassword, true]
    );
    
    const adminId = adminResult.rows[0]?.id || (await client.query('SELECT id FROM users WHERE email = $1', ['admin@fcbhyderabad.com'])).rows[0].id;
    console.log('✅ Admin user created (email: admin@fcbhyderabad.com, password: admin123)');

    // 2. Seed tags
    const tags = ['Match Day', 'News', 'Player Focus', 'Tactics', 'History', 'Youth Academy', 'Transfer News', 'Fan Culture'];
    for (const tag of tags) {
      await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tag]);
    }
    console.log('✅ Tags created');

    // 3. Create sample blogs
    const blogs = [
      {
        title: 'Barça\'s Legacy in India: The Hyderabad Chapter',
        content: '<h2>Welcome to FCB Hyderabad Peña!</h2><p>As one of the most passionate Barcelona supporter groups in India, we bring together fans who bleed Blaugrana. Our peña organizes match screenings, discussions, and events celebrating the beautiful game as played by FC Barcelona.</p><h3>Our Mission</h3><ul><li>Unite Barcelona fans across Hyderabad</li><li>Create memorable match-day experiences</li><li>Spread the Barça philosophy</li><li>Build a community of Culés</li></ul><p><strong>Visca el Barça!</strong> 🔵🔴</p>'
      },
      {
        title: 'El Clásico Watch Party: An Unforgettable Night',
        content: '<h2>Record Turnout for El Clásico!</h2><p>Last weekend, over 200 Culés gathered at our venue to witness the historic El Clásico. The atmosphere was electric as Barça dominated Real Madrid.</p><h3>Highlights</h3><p>⚽ Amazing goals<br>🎉 Incredible atmosphere<br>🍕 Great food and drinks<br>👥 New friendships formed</p><p>Thank you to everyone who made it special!</p>'
      }
    ];

    for (const blog of blogs) {
      await client.query(
        'INSERT INTO blogs (title, content, author_id) VALUES ($1, $2, $3)',
        [blog.title, blog.content, adminId]
      );
    }
    console.log('✅ Sample blogs created');

    // 4. Create events
    const events = [
      {
        title: 'FC Barcelona vs Real Madrid - El Clásico Screening',
        description: 'Join us for the biggest match of the season! Watch El Clásico with fellow Culés in an electric atmosphere. Big screen, great food, and amazing vibes guaranteed!',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: 'Hyderabad',
        venue_name: 'Sports Bar Arena',
        total_seats: 100,
        available_seats: 100,
        price: 299,
        image_url: '/uploads/events/clasico.jpg'
      },
      {
        title: 'Champions League Quarter Final Screening',
        description: 'Watch Barça battle in the Champions League! Experience the magic of European nights with your fellow supporters.',
        event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        location: 'Hyderabad',
        venue_name: 'Champions Lounge',
        total_seats: 75,
        available_seats: 75,
        price: 349,
        image_url: '/uploads/events/ucl.jpg'
      },
      {
        title: 'La Liga Match Day - Barça vs Atlético Madrid',
        description: 'Another crucial La Liga fixture! Join us to support our team against tough opposition.',
        event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        location: 'Hyderabad',
        venue_name: 'Football Fanzone',
        total_seats: 60,
        available_seats: 60,
        price: 249,
        image_url: '/uploads/events/laliga.jpg'
      }
    ];

    for (const event of events) {
      await client.query(
        `INSERT INTO events (title, description, event_date, location, venue_name, total_seats, available_seats, price, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [event.title, event.description, event.event_date, event.location, event.venue_name, 
         event.total_seats, event.available_seats, event.price, event.image_url]
      );
    }
    console.log('✅ Events created');

    // 5. Create products
    const products = [
      { name: 'FCB Hyderabad Official T-Shirt', description: 'Premium quality cotton t-shirt with FCB Hyderabad logo', category: 'Apparel', base_price: 799, image_url: '/uploads/products/tshirt.jpg' },
      { name: 'FCB Hyderabad Cap', description: 'Stylish cap with embroidered logo', category: 'Accessories', base_price: 499, image_url: '/uploads/products/cap.jpg' },
      { name: 'FCB Hyderabad Hoodie', description: 'Warm and comfortable hoodie for true fans', category: 'Apparel', base_price: 1499, image_url: '/uploads/products/hoodie.jpg' },
      { name: 'FCB Hyderabad Mug', description: 'Start your day with Barça spirit!', category: 'Accessories', base_price: 299, image_url: '/uploads/products/mug.jpg' },
      { name: 'FCB Hyderabad Scarf', description: 'Show your colors with pride', category: 'Accessories', base_price: 599, image_url: '/uploads/products/scarf.jpg' }
    ];

    for (const product of products) {
      const productResult = await client.query(
        `INSERT INTO products (name, description, category, base_price, image_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [product.name, product.description, product.category, product.base_price, product.image_url]
      );
      
      const productId = productResult.rows[0].id;
      
      // Add variants
      if (product.category === 'Apparel') {
        const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
        const colors = ['Blue', 'Red', 'Navy'];
        for (const size of sizes) {
          for (const color of colors) {
            await client.query(
              `INSERT INTO product_variants (product_id, size, color, stock_quantity, price, sku)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [productId, size, color, 50, product.base_price, `${product.name.substring(0,3).toUpperCase()}-${size}-${color.substring(0,3).toUpperCase()}`]
            );
          }
        }
      } else {
        await client.query(
          `INSERT INTO product_variants (product_id, size, color, stock_quantity, price, sku)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [productId, 'One Size', 'Blue/Red', 100, product.base_price, `${product.name.substring(0,3).toUpperCase()}-OS`]
        );
      }
    }
    console.log('✅ Products and variants created');

    console.log('\n🎉 Production database seeded successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email: admin@fcbhyderabad.com');
    console.log('   Password: admin123');
    console.log('\n🔵🔴 Visca el Barça! Your site is ready!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProduction();
