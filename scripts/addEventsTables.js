const pool = require('../config/database');

const addEventsTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔵🔴 Adding Events and Bookings tables...');

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        match_details TEXT,
        venue_name VARCHAR(255) NOT NULL,
        venue_address TEXT NOT NULL,
        event_date TIMESTAMP NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cover_charge DECIMAL(10, 2) DEFAULT 0,
        total_capacity INTEGER NOT NULL,
        booked_seats INTEGER DEFAULT 0,
        cover_image VARCHAR(500),
        upi_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Events table created');

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        number_of_people INTEGER NOT NULL DEFAULT 1,
        payment_screenshot VARCHAR(500),
        payment_amount DECIMAL(10, 2) NOT NULL,
        booking_status VARCHAR(50) DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table created');

    // Add index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
      CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    `);
    console.log('✅ Indexes created');

    console.log('🎉 Events system setup complete!');
    console.log('🔵🔴 Visca el Barça! 🔴🔵');
    
  } catch (error) {
    console.error('❌ Error adding events tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

addEventsTables();
