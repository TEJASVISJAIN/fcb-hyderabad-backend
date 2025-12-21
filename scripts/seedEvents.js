const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seedEvents() {
  const client = await pool.connect();
  
  try {
    // Get admin user ID
    const adminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@viscabarca.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found. Please run initDb.js first.');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    
    // Sample match screening events
    const events = [
      {
        title: 'FC Barcelona vs Real Madrid - El Clásico',
        description: `Join us for the most anticipated match of the season! Watch El Clásico live with fellow culés at our exclusive screening venue.

**What to expect:**
- Large HD screens for optimal viewing
- FC Barcelona themed decorations
- Snacks and beverages available
- Meet and greet with local Barcelona fan community
- Live commentary and discussions

Arrive early to get the best seats! Visca Barça! 🔴🔵`,
        match_details: 'La Liga - FC Barcelona vs Real Madrid',
        venue_name: 'Inorbit Mall Cinepolis',
        venue_address: 'Inorbit Mall, Cyberabad, Madhapur, Hyderabad, Telangana 500081',
        event_date: '2025-12-28T19:30:00',
        price: 300,
        cover_charge: 200,
        total_capacity: 50,
        cover_image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        upi_id: 'viscabarca@paytm',
        status: 'upcoming',
        created_by: adminId
      },
      {
        title: 'FC Barcelona vs Atletico Madrid',
        description: `Experience the thrill of watching Barcelona take on Atletico Madrid with the biggest Barça fan community in Hyderabad!

**Event Highlights:**
- Premium viewing experience
- Barcelona merchandise on display
- Cover charge redeemable on food & drinks
- Interactive halftime activities
- Photo booth with FC Barcelona props

Limited seats available. Book now!`,
        match_details: 'La Liga - FC Barcelona vs Atletico Madrid',
        venue_name: 'PVR Cinemas Next Galleria',
        venue_address: 'Next Galleria Mall, Panjagutta, Hyderabad, Telangana 500082',
        event_date: '2026-01-05T21:00:00',
        price: 250,
        cover_charge: 150,
        total_capacity: 40,
        cover_image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
        upi_id: 'viscabarca@paytm',
        status: 'upcoming',
        created_by: adminId
      },
      {
        title: 'UEFA Champions League: Barcelona vs Bayern Munich',
        description: `The biggest European night! Watch Barcelona battle Bayern Munich in this crucial Champions League knockout match.

**Special Features:**
- Giant screen setup
- Surround sound system
- Pre-match team analysis session
- Halftime quiz with prizes
- Post-match discussions
- Exclusive Barça merchandise raffle

This is going to be EPIC! Don't miss out! 💙❤️`,
        match_details: 'UEFA Champions League Round of 16 - FC Barcelona vs Bayern Munich',
        venue_name: 'AMB Cinemas',
        venue_address: 'Asian Mukta Boulevard, Gachibowli, Hyderabad, Telangana 500032',
        event_date: '2026-01-15T01:30:00',
        price: 400,
        cover_charge: 250,
        total_capacity: 60,
        cover_image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800',
        upi_id: 'viscabarca@paytm',
        status: 'upcoming',
        created_by: adminId
      },
      {
        title: 'FC Barcelona vs Sevilla - Copa del Rey',
        description: `Join us for an exciting Copa del Rey match! Watch Barcelona chase glory in the cup competition.

**Included:**
- Comfortable seating
- Match commentary
- Snacks counter
- Free parking
- Barcelona chants and songs session

Perfect for families and solo fans alike!`,
        match_details: 'Copa del Rey Quarter Final - FC Barcelona vs Sevilla',
        venue_name: 'Prasads IMAX',
        venue_address: 'Necklace Road, Hussain Sagar, Hyderabad, Telangana 500063',
        event_date: '2026-01-22T22:00:00',
        price: 200,
        cover_charge: 100,
        total_capacity: 45,
        cover_image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
        upi_id: 'viscabarca@paytm',
        status: 'upcoming',
        created_by: adminId
      },
      {
        title: 'New Year Special: Barcelona vs Espanyol Derby',
        description: `Ring in the New Year with a Barcelona derby! Special celebration screening with the peña family.

**New Year Special:**
- Countdown celebration (if timing permits)
- Special decorations
- Complimentary snacks for first 20 bookings
- Live DJ during halftime
- Group photo session
- Exclusive peña membership cards available

Limited slots - Book fast! 🎉⚽`,
        match_details: 'La Liga - FC Barcelona vs Espanyol (Derby)',
        venue_name: 'Cinepolis Manjeera Mall',
        venue_address: 'Manjeera Mall, JNTU-Hitech City Road, Kukatpally, Hyderabad, Telangana 500072',
        event_date: '2026-01-01T18:30:00',
        price: 350,
        cover_charge: 200,
        total_capacity: 35,
        cover_image: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800',
        upi_id: 'viscabarca@paytm',
        status: 'upcoming',
        created_by: adminId
      }
    ];
    
    console.log('🌱 Seeding match screening events...\n');
    
    for (const event of events) {
      const result = await client.query(
        `INSERT INTO events (
          title, description, match_details, venue_name, venue_address,
          event_date, price, cover_charge, total_capacity, booked_seats,
          cover_image, upi_id, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, title`,
        [
          event.title,
          event.description,
          event.match_details,
          event.venue_name,
          event.venue_address,
          event.event_date,
          event.price,
          event.cover_charge,
          event.total_capacity,
          0, // booked_seats starts at 0
          event.cover_image,
          event.upi_id,
          event.status,
          event.created_by
        ]
      );
      
      console.log(`✅ Created: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
    }
    
    console.log('\n🎉 Successfully seeded all match screening events!');
    console.log(`📊 Total events created: ${events.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding events:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedEvents();
