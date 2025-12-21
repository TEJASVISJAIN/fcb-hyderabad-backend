// Test database connection
require('dotenv').config({ path: '.env.production' });
const pool = require('../config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database name:', result.rows[0].db_name);
    
    // Test if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in database:');
    tablesResult.rows.forEach(row => console.log('  -', row.table_name));
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
