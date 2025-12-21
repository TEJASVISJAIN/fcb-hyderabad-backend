const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seedBlogs() {
  const client = await pool.connect();
  
  try {
    // Get admin user ID
    const adminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@viscabarca.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('