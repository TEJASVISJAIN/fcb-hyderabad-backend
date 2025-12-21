const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addSeatLocks() {
  const client = await pool.connect();
  
  try {
    console.log('🔒 Adding seat locks table...\n');

    // Create seat_locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_locks (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        seats_locked INTEGER NOT NULL,
        locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE(event_id, session_id)
      )
    `);
    console.log('✅ Seat locks table created');

    // Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_seat_locks_event_id ON seat_locks(event_id);
      CREATE INDEX IF NOT EXISTS idx_seat_locks_expires_at ON seat_locks(expires_at);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Seat locking system setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addSeatLocks();
